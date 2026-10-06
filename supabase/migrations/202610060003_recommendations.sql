-- Atomic, reader-scoped recommendation sessions, feedback and explicit corrections.
begin;
alter table public.recommendation_feedback add column preference_effect text check (preference_effect is null or preference_effect = 'show_less');
alter table public.recommendation_feedback add column correction_action text check (correction_action is null or correction_action in ('keep','reduce','remove'));

create function public.save_recommendation_session(session_key uuid, reading_request text, selected_filters jsonb,
  allowed_signals jsonb, candidates text[], results jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare reader_id uuid := auth.uid(); session_owner uuid; item jsonb; metadata_id uuid; signal_id uuid;
begin
  if reader_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if session_key is null or char_length(btrim(reading_request)) not between 2 and 240
    or jsonb_typeof(selected_filters) is distinct from 'object' or jsonb_typeof(allowed_signals) is distinct from 'array'
    or jsonb_array_length(allowed_signals)>30 or jsonb_typeof(results) is distinct from 'array' or jsonb_array_length(results)<>3
    or cardinality(candidates) not between 3 and 30 then raise exception 'Invalid session' using errcode='22023'; end if;
  insert into public.recommendation_sessions(id,user_id,request_text,filters,permitted_signals,candidate_google_books_ids,status)
    values(session_key,reader_id,btrim(reading_request),selected_filters,allowed_signals,candidates,'pending') on conflict(id) do nothing;
  select user_id into session_owner from public.recommendation_sessions where id=session_key for update;
  if session_owner is distinct from reader_id then raise exception 'Session unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.recommendation_sessions where id=session_key and status='completed') then return session_key; end if;
  if exists(select 1 from public.recommendation_sessions where id=session_key and (request_text<>btrim(reading_request) or filters<>selected_filters))
    then raise exception 'Session request changed' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(allowed_signals) loop
    if not exists(select 1 from public.reading_dna_signals s join public.ai_settings a on a.user_id=s.user_id
      where s.id=(item->>'id')::uuid and s.user_id=reader_id and s.active and a.personalisation_enabled
      and (s.source_type in ('onboarding','manual','correction') or (s.source_type='rating' and a.use_recent_ratings)
      or (s.source_type='dnf' and a.use_dnf_reasons))) then raise exception 'Signal unavailable' using errcode='42501'; end if;
  end loop;
  for item in select value from jsonb_array_elements(results) loop
    if (item->'book'->>'googleBooksId'=any(candidates)) is not true or jsonb_typeof(item->'matchedSignals') is distinct from 'array'
      then raise exception 'Candidate unavailable' using errcode='22023'; end if;
    for signal_id in select value::uuid from jsonb_array_elements_text(item->'matchedSignals') loop
      if not exists(select 1 from jsonb_array_elements(allowed_signals) s where s->>'id'=signal_id::text)
        then raise exception 'Evidence unavailable' using errcode='42501'; end if;
    end loop;
    select id into metadata_id from public.books where google_books_id=item->'book'->>'googleBooksId';
    if metadata_id is null then
      if item->'book'->>'googleBooksId' like 'manual:%' then raise exception 'Private book unavailable' using errcode='42501'; end if;
      if item->'book'->>'thumbnailUrl' is not null and item->'book'->>'thumbnailUrl' !~ '^https://(books[.]google[.]com|books[.]googleusercontent[.]com)/'
        then raise exception 'Invalid cover' using errcode='22023'; end if;
      insert into public.books(google_books_id,title,authors,description,page_count,categories,published_date,thumbnail_url,isbn)
        values(item->'book'->>'googleBooksId',item->'book'->>'title',array(select jsonb_array_elements_text(item->'book'->'authors')),
          item->'book'->>'description',(item->'book'->>'pageCount')::integer,array(select jsonb_array_elements_text(item->'book'->'categories')),
          item->'book'->>'publishedDate',item->'book'->>'thumbnailUrl',item->'book'->>'isbn') on conflict(google_books_id) do nothing;
      select id into metadata_id from public.books where google_books_id=item->'book'->>'googleBooksId';
    end if;
    insert into public.recommendations(user_id,session_id,book_id,rank,reason,matched_signals,confidence_label)
      values(reader_id,session_key,metadata_id,(item->>'rank')::smallint,item->>'reason',item->'matchedSignals',item->>'confidence');
  end loop;
  update public.recommendation_sessions set status='completed' where id=session_key and user_id=reader_id;
  return session_key;
end;
$$;

create function public.record_recommendation_feedback(recommendation_key uuid, action text, feedback_reason text default null,
  signal_key uuid default null, signal_action text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare reader_id uuid:=auth.uid(); rec public.recommendations%rowtype; prior public.recommendation_feedback%rowtype; feedback_id uuid;
begin
  if reader_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into rec from public.recommendations where id=recommendation_key and user_id=reader_id;
  if not found then raise exception 'Recommendation unavailable' using errcode='42501'; end if;
  perform id from public.recommendation_sessions where id=rec.session_id and user_id=reader_id for update;
  if action is null or action not in ('helpful','not_for_me','show_less','undo_less','correct') or char_length(feedback_reason)>250
    or (action='not_for_me' and coalesce(char_length(btrim(feedback_reason)),0)=0)
    or (action='correct' and (signal_key is null or signal_action is null or signal_action not in ('keep','reduce','remove')))
    then raise exception 'Invalid feedback' using errcode='22023'; end if;
  select * into prior from public.recommendation_feedback where recommendation_id=recommendation_key;
  if action='undo_less' then
    update public.recommendation_feedback set preference_effect=null where recommendation_id=recommendation_key returning id into feedback_id;
    return feedback_id;
  end if;
  if action='correct' then
    if not exists(select 1 from jsonb_array_elements_text(rec.matched_signals) m where m=signal_key::text)
      or not exists(select 1 from public.reading_dna_signals where id=signal_key and user_id=reader_id)
      then raise exception 'Signal unavailable' using errcode='42501'; end if;
    -- A retried save must not reduce the signal a second time.
    if prior.corrected_signal_id=signal_key and prior.correction_action=signal_action then return prior.id; end if;
    update public.reading_dna_signals set internal_weight=case when signal_action='reduce' then internal_weight/2 else internal_weight end,
      active=case when signal_action='remove' then false else active end where id=signal_key and user_id=reader_id;
  end if;
  insert into public.recommendation_feedback(user_id,recommendation_id,feedback,reason,preference_effect,corrected_signal_id,correction_action)
    values(reader_id,recommendation_key,case when action='helpful' then 'helpful' else 'not_for_me' end,
      feedback_reason,case when action='show_less' then 'show_less' else prior.preference_effect end,
      case when action='correct' then signal_key else prior.corrected_signal_id end,
      case when action='correct' then signal_action else prior.correction_action end)
    on conflict(recommendation_id) do update set feedback=excluded.feedback,reason=excluded.reason,
      preference_effect=excluded.preference_effect,corrected_signal_id=excluded.corrected_signal_id,correction_action=excluded.correction_action
    returning id into feedback_id;
  return feedback_id;
end;
$$;
revoke all on function public.save_recommendation_session(uuid,text,jsonb,jsonb,text[],jsonb) from public,anon;
revoke all on function public.record_recommendation_feedback(uuid,text,text,uuid,text) from public,anon;
grant execute on function public.save_recommendation_session(uuid,text,jsonb,jsonb,text[],jsonb) to authenticated;
grant execute on function public.record_recommendation_feedback(uuid,text,text,uuid,text) to authenticated;
commit;
