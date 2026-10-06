-- Settings and CSV import. Existing account and Library records are preserved.
begin;
alter table public.profiles add column reader_preferences jsonb not null default '{"theme":"system","density":"comfortable","textScale":"system","reduceMotion":false,"highContrast":false,"haptics":false,"reminders":false,"digest":false,"nudges":false,"reminderTime":"19:00"}'::jsonb;
alter table public.profiles add constraint profiles_reader_preferences_object check (jsonb_typeof(reader_preferences)='object');
-- Private manual/imported metadata cannot be referenced through a foreign reader's recommendations.
drop policy "recommendations_insert_own" on public.recommendations;
create policy "recommendations_insert_own" on public.recommendations for insert to authenticated
  with check (user_id=(select auth.uid()) and exists(select 1 from public.books b where b.id=book_id));

create function public.save_reader_settings(change jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); p jsonb; k text;
begin
  if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(change) is distinct from 'object' then raise exception 'Invalid settings' using errcode='22023'; end if;
  if change->>'kind'='profile' then
    if char_length(btrim(change->>'name')) not between 1 and 60 or change->>'name' is null then raise exception 'Invalid name' using errcode='22023'; end if;
    update public.profiles set display_name=btrim(change->>'name') where id=reader;
  elsif change->>'kind'='permissions' then
    foreach k in array array['enabled','ratings','history','dnf'] loop
      if jsonb_typeof(change->k) is distinct from 'boolean' then raise exception 'Invalid permissions' using errcode='22023'; end if;
    end loop;
    if not (change->>'enabled')::boolean and ((change->>'ratings')::boolean or (change->>'history')::boolean or (change->>'dnf')::boolean) then raise exception 'Personalisation is disabled' using errcode='22023'; end if;
    update public.ai_settings set personalisation_enabled=(change->>'enabled')::boolean,use_recent_ratings=(change->>'ratings')::boolean,use_recent_history=(change->>'history')::boolean,use_dnf_reasons=(change->>'dnf')::boolean where user_id=reader;
  elsif change->>'kind'='preferences' then
    p:=change->'preferences';
    if jsonb_typeof(p) is distinct from 'object' or (select count(*) from jsonb_object_keys(p))<>10
      or coalesce(p->>'theme','') not in ('system','light','dark') or coalesce(p->>'density','') not in ('comfortable','compact')
      or coalesce(p->>'textScale','') not in ('system','large') or coalesce(p->>'reminderTime','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      then raise exception 'Invalid preferences' using errcode='22023'; end if;
    foreach k in array array['reduceMotion','highContrast','haptics','reminders','digest','nudges'] loop
      if jsonb_typeof(p->k) is distinct from 'boolean' then raise exception 'Invalid preference' using errcode='22023'; end if;
    end loop;
    update public.profiles set reader_preferences=p where id=reader;
  elsif change->>'kind'='reset' and change->>'confirmation'='RESET' then
    update public.reading_dna_signals set active=false where user_id=reader;
    update public.profiles set reading_setup_preferences='{"genres":[],"storyElements":[],"pacing":"","moods":[]}'::jsonb,reading_setup_completed_at=null where id=reader;
    update public.ai_settings set personalisation_enabled=false,use_recent_ratings=false,use_recent_history=false,use_dnf_reasons=false where user_id=reader;
    update public.recommendation_feedback set preference_effect=null where user_id=reader;
  else raise exception 'Invalid settings operation' using errcode='22023'; end if;
end; $$;

create function public.import_library_row(entry jsonb, metadata jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); book_key uuid; library_key uuid; external_id text; isbn_value text; title_value text; author_value text; status_value text; pages integer; stars integer; start_day date; finish_day date; thumbnail text;
begin
  if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
  title_value:=btrim(entry->>'title'); author_value:=btrim(entry->>'author'); isbn_value:=nullif(entry->>'isbn',''); status_value:=entry->>'status';
  if jsonb_typeof(entry) is distinct from 'object' or title_value is null or author_value is null
    or char_length(title_value) not between 1 and 300 or char_length(author_value) not between 1 and 200
    or coalesce(status_value,'') not in ('reading','want_to_read','dnf','finished') or coalesce(char_length(entry->>'notes'),0)>2000
    or (isbn_value is not null and isbn_value !~ '^([0-9]{13}|[0-9]{9}[0-9X])$') then raise exception 'Invalid import row' using errcode='22023'; end if;
  pages:=(entry->>'pageCount')::integer; stars:=(entry->>'rating')::integer;
  start_day:=(entry->>'startedAt')::date; finish_day:=(entry->>'finishedAt')::date;
  if (pages is not null and pages not between 1 and 100000) or (stars is not null and stars not between 1 and 5)
    or (finish_day is not null and start_day is not null and finish_day<start_day) then raise exception 'Invalid imported values' using errcode='22023'; end if;
  -- Serialise imports for this reader, including differently identified editions of the same title.
  perform pg_advisory_xact_lock(hashtextextended(reader::text,0));
  select ub.id into library_key from public.user_books ub join public.books b on b.id=ub.book_id
    where ub.user_id=reader and ((isbn_value is not null and b.isbn=isbn_value)
      or (lower(regexp_replace(b.title,'[^[:alnum:]]','','g'))=lower(regexp_replace(title_value,'[^[:alnum:]]','','g'))
        and lower(regexp_replace(array_to_string(b.authors,', '),'[^[:alnum:]]','','g'))=lower(regexp_replace(author_value,'[^[:alnum:]]','','g')))) limit 1;
  if library_key is not null then return jsonb_build_object('state','duplicate','id',library_key); end if;
  external_id:=case when metadata is null then 'manual:import:'||reader::text||':'||md5(coalesce(isbn_value,lower(title_value)||'|'||lower(author_value))) else metadata->>'googleBooksId' end;
  thumbnail:=metadata->>'thumbnailUrl';
  if metadata is not null and (jsonb_typeof(metadata) is distinct from 'object' or coalesce(external_id,'') !~ '^[A-Za-z0-9_-]{1,100}$'
    or char_length(coalesce(metadata->>'title','')) not between 1 and 1000 or jsonb_typeof(metadata->'authors') is distinct from 'array'
    or (thumbnail is not null and thumbnail !~ '^https://(books[.]google[.]com|books[.]googleusercontent[.]com)/')) then raise exception 'Invalid catalogue metadata' using errcode='22023'; end if;
  insert into public.books(google_books_id,title,authors,page_count,thumbnail_url,isbn,description,categories,published_date,created_by)
    values(external_id,case when metadata is null then title_value else metadata->>'title' end,
      case when metadata is null then array[author_value] else array(select jsonb_array_elements_text(metadata->'authors')) end,
      case when metadata is null then pages else nullif(metadata->>'pageCount','0')::integer end,thumbnail,isbn_value,
      metadata->>'description',coalesce(array(select jsonb_array_elements_text(metadata->'categories')),'{}'),metadata->>'publishedDate',case when metadata is null then reader else null end)
    on conflict(google_books_id) do nothing;
  select id into book_key from public.books where google_books_id=external_id and (created_by is null or created_by=reader);
  if book_key is null then raise exception 'Book unavailable' using errcode='42501'; end if;
  insert into public.user_books(user_id,book_id,status,progress_percent,rating,notes,is_favourite,started_at,finished_at,dnf_use_for_learning)
    values(reader,book_key,status_value,case when status_value='finished' then 100 else 0 end,stars,coalesce(entry->>'notes',''),coalesce((entry->>'favourite')::boolean,false),start_day,case when status_value='finished' then finish_day else null end,false)
    on conflict(user_id,book_id) do nothing returning id into library_key;
  if library_key is null then
    select id into library_key from public.user_books where user_id=reader and book_id=book_key;
    return jsonb_build_object('state','duplicate','id',library_key);
  end if;
  return jsonb_build_object('state','added','id',library_key,'coverMatched',thumbnail is not null);
end; $$;

-- The sole privileged operation accepts no target ID. A fresh password-authenticated
-- JWT and explicit confirmation are required. No service-role key is exposed to the app.
create function public.delete_reader_account(confirmation text)
returns void language plpgsql security definer set search_path='' as $$
declare reader uuid:=auth.uid(); claims jsonb:=auth.jwt(); recent_password boolean:=false;
begin
  if reader is null or confirmation is distinct from 'DELETE' then raise exception 'Deletion not confirmed' using errcode='42501'; end if;
  select exists(select 1 from jsonb_array_elements(coalesce(claims->'amr','[]'::jsonb)) as method
    where method->>'method'='password' and (method->>'timestamp')::numeric between extract(epoch from now())-300 and extract(epoch from now())+30) into recent_password;
  if not recent_password then raise exception 'Verify your password again' using errcode='42501'; end if;
  -- Remove dependent private book references before their metadata. Shared catalogue facts remain.
  delete from public.recommendation_sessions where user_id=reader;
  delete from public.user_books where user_id=reader;
  delete from public.books where created_by=reader;
  delete from auth.users where id=reader;
end; $$;
revoke all on function public.save_reader_settings(jsonb) from public,anon;
revoke all on function public.import_library_row(jsonb,jsonb) from public,anon;
revoke all on function public.delete_reader_account(text) from public,anon;
grant execute on function public.save_reader_settings(jsonb),public.import_library_row(jsonb,jsonb),public.delete_reader_account(text) to authenticated;
commit;

