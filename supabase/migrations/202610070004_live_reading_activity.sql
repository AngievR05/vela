-- Learn from reader-approved ratings and completed books in the same save transaction.
begin;
alter table public.user_books add column rating_recorded_at timestamptz, add column reading_completed_at timestamptz;
update public.user_books set rating_recorded_at=case when rating is not null then updated_at end,
 reading_completed_at=case when status='finished' then coalesce(finished_at::timestamptz,updated_at) end;
alter table public.reading_dna_signals drop constraint reading_dna_source_valid;
alter table public.reading_dna_signals add constraint reading_dna_source_valid check(source_type in ('onboarding','rating','history','dnf','correction','manual','mixed'));

create or replace function public.track_dna_influence() returns trigger language plpgsql set search_path='' as $$
begin
 if new.evidence is distinct from old.evidence and new.category in ('rating_genre','history_genre') and new.source_type in ('rating','history') then return new; end if;
 if new.influence_state=old.influence_state then
  if not new.active then new.influence_state:='stopped';
  elsif new.internal_weight<old.internal_weight then new.influence_state:='reduced';
  elsif not old.active then new.influence_state:='normal'; end if;
 end if;
 return new;
end; $$;

create function public.stamp_reading_activity() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  new.rating_recorded_at:=case when new.rating is not null then clock_timestamp() end;
  new.reading_completed_at:=case when new.status='finished' then clock_timestamp() end;
 else
  -- Timestamps are controlled by the activity, never by arbitrary note edits or client input.
  new.rating_recorded_at:=case when new.rating is distinct from old.rating then case when new.rating is not null then clock_timestamp() end else old.rating_recorded_at end;
  new.reading_completed_at:=case when new.status is distinct from old.status then case when new.status='finished' then clock_timestamp() end else old.reading_completed_at end;
 end if;
 return new;
end; $$;
create trigger user_books_activity_stamp before insert or update on public.user_books for each row execute function public.stamp_reading_activity();

create function public.refresh_reading_activity() returns void language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); cutoff timestamptz; settings public.ai_settings%rowtype; item record; desired text[]:=array[]::text[];
begin
 if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select reading_dna_reset_at into cutoff from public.profiles where id=reader for update;
 if not found then raise exception 'Reader unavailable' using errcode='42501'; end if;
 select * into settings from public.ai_settings where user_id=reader;
 -- Clear obsolete evidence without undoing a reader's Keep/Reduce/Stop control.
 -- Empty evidence makes a signal ineligible without changing its stored influence.
 for item in
  with activity as (
   select u.id,u.rating,u.rating_recorded_at,u.reading_completed_at,b.categories from public.user_books u join public.books b on b.id=u.book_id
    where u.user_id=reader and not u.is_removed
  ), facts as (
   select distinct a.id, a.rating, a.rating_recorded_at, a.reading_completed_at, btrim(part) genre
   from activity a cross join lateral unnest(a.categories) c cross join lateral regexp_split_to_table(c,'/') part
   where char_length(btrim(part)) between 2 and 80 and lower(btrim(part)) not in ('fiction','general','nonfiction','non-fiction')
  ), evidence as (
   select 'rating_genre' category,case when rating>=4 then 'Higher ratings · ' else 'Lower ratings · ' end||genre label,'rating' source,
    jsonb_build_object('user_book_id',id,'occurred_at',rating_recorded_at,'rating',rating,'auto_activity',true) entry
   from facts where settings.personalisation_enabled and settings.use_recent_ratings and (rating>=4 or rating<=2) and (cutoff is null or rating_recorded_at>cutoff)
   union all
   select 'history_genre','Finished · '||genre,'history',jsonb_build_object('user_book_id',id,'occurred_at',reading_completed_at,'auto_activity',true)
   from facts where settings.personalisation_enabled and settings.use_recent_history and reading_completed_at is not null and (cutoff is null or reading_completed_at>cutoff)
  ), grouped as (
   select category,label,source,jsonb_agg(entry order by entry->>'user_book_id') entries,least(0.9,0.3+0.1*count(*)) weight from evidence group by category,label,source
  ) select * from grouped
 loop
  desired:=array_append(desired,item.category||chr(10)||item.label);
  insert into public.reading_dna_signals(user_id,category,label,source_type,evidence,internal_weight)
   values(reader,item.category,item.label,item.source,item.entries,item.weight)
   on conflict(user_id,category,label) do update set evidence=excluded.evidence,
    internal_weight=case when reading_dna_signals.influence_state='normal' then excluded.internal_weight else reading_dna_signals.internal_weight end
   where reading_dna_signals.source_type=excluded.source_type and
    (reading_dna_signals.evidence is distinct from excluded.evidence or (reading_dna_signals.influence_state='normal' and reading_dna_signals.internal_weight is distinct from excluded.internal_weight));
 end loop;
 -- Groups not rebuilt no longer have current approved activity. Keep their correction state.
 update public.reading_dna_signals s set evidence='[]'::jsonb
 where s.user_id=reader and s.category in ('rating_genre','history_genre') and s.source_type in ('rating','history')
  and s.evidence<>'[]'::jsonb and not ((s.category||chr(10)||s.label)=any(desired));
end; $$;
revoke all on function public.refresh_reading_activity() from public,anon;
grant execute on function public.refresh_reading_activity() to authenticated;

create function public.sync_reading_activity() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is not null and auth.uid()=coalesce(new.user_id,old.user_id) and exists(select 1 from public.profiles where id=auth.uid()) then perform public.refresh_reading_activity(); end if;
 return null;
end; $$;
create trigger user_books_activity_sync after insert or delete or update of rating,status,is_removed on public.user_books for each row execute function public.sync_reading_activity();
create trigger ai_settings_activity_sync after update of personalisation_enabled,use_recent_ratings,use_recent_history on public.ai_settings for each row execute function public.sync_reading_activity();

create or replace function public.save_recommendation_session(session_key uuid, reading_request text, selected_filters jsonb,
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
      or (s.source_type='dnf' and a.use_dnf_reasons) or (s.source_type='history' and a.use_recent_history))) then raise exception 'Signal unavailable' using errcode='42501'; end if;
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


commit;
