begin;
alter table public.user_books
 add column rating_use_for_learning boolean not null default true,
 add column history_use_for_learning boolean not null default true,
 add column finish_feedback text[] not null default '{}',
 add column finish_use_for_learning boolean not null default false,
 add column reflection_recorded_at timestamptz,
 add column dnf_reasons text[] not null default '{}',
 add column private_dnf_note text not null default '',
 add column stopped_at date,
 add column dnf_recorded_at timestamptz;
alter table public.user_books add constraint reader_finish_feedback_valid check(finish_feedback <@ array['Characters','World-building','Romance','Mystery','Writing style','Atmosphere','Humour','Themes','Fast pacing','Slow pacing','Emotional depth','Found family']::text[]);
alter table public.user_books add constraint reader_dnf_choices_valid check(dnf_reasons <@ array['Pacing too slow','Did not connect','Writing style','Not in the mood','Too confusing','Lost interest']::text[]);
alter table public.user_books add constraint private_dnf_note_length check(char_length(private_dnf_note)<=300);

create table public.reader_book_updates(
 id uuid primary key, user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 user_book_id uuid not null references public.user_books(id) on delete cascade,
 kind text not null, request jsonb not null, before_state jsonb not null, after_updated_at timestamptz,
 result jsonb, undone boolean not null default false, created_at timestamptz not null default now()
);
alter table public.reader_book_updates enable row level security;
create policy reader_updates_select on public.reader_book_updates for select to authenticated using(user_id=auth.uid());
create policy reader_updates_insert on public.reader_book_updates for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.user_books u where u.id=user_book_id and u.user_id=auth.uid()));
create policy reader_updates_update on public.reader_book_updates for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.reader_book_updates from public,anon;
grant select,insert,update on public.reader_book_updates to authenticated;
create index reader_updates_book on public.reader_book_updates(user_id,user_book_id,created_at desc);

create function public.save_reader_update(book_entry uuid, changes jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); entry public.user_books%rowtype; updated public.user_books%rowtype; operation uuid; action text;
 saved public.reader_book_updates%rowtype; prior public.reader_book_updates%rowtype; page_total integer; amount integer; page integer;
 start_day date; end_day date; choices text[]; note text; learning boolean; settings public.ai_settings%rowtype; outcome jsonb;
begin
 if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(changes) is distinct from 'object' then raise exception 'Invalid reading update' using errcode='22023'; end if;
 operation:=(changes->>'operationId')::uuid; action:=changes->>'kind';
 if operation is null or (changes->>'id')::uuid is distinct from book_entry or action is null or action not in('progress','finish','dnf','reading_dates','restore_reading','undo_reading') then raise exception 'Invalid reading update' using errcode='22023'; end if;
 select * into entry from public.user_books where id=book_entry and user_id=reader for update;
 if not found or entry.is_removed then raise exception 'Book unavailable' using errcode='42501'; end if;
 select * into saved from public.reader_book_updates where id=operation;
 if found then
  if saved.user_id<>reader or saved.user_book_id<>book_entry or saved.request<>changes then raise exception 'Update identity changed' using errcode='22023'; end if;
  return saved.result||jsonb_build_object('duplicate',true);
 end if;
 if changes->>'expectedUpdatedAt' is null or (changes->>'expectedUpdatedAt')::timestamptz<>entry.updated_at then raise exception 'Book changed. Refresh before saving.' using errcode='40001'; end if;
 select page_count into page_total from public.books where id=entry.book_id;
 select * into settings from public.ai_settings where user_id=reader;
 learning:=coalesce((changes->>'useForLearning')::boolean,false);
 insert into public.reader_book_updates(id,user_id,user_book_id,kind,request,before_state) values(operation,reader,book_entry,action,changes,to_jsonb(entry));
 if action='progress' then
  if entry.status<>'reading' then raise exception 'Book is not in Reading' using errcode='40001'; end if;
  amount:=(changes->>'percent')::integer; page:=(changes->>'page')::integer; note:=coalesce(changes->>'note','');
  if amount is null or amount not between 0 and 100 or char_length(note)>300 or
    (page is not null and (page_total is null or page_total<=0 or page<0 or page>page_total or amount<>case when page_total<=0 then -1 when page=page_total then 100 else least(99,round(page::numeric*100/page_total)) end)) then raise exception 'Check page or percentage' using errcode='22023'; end if;
  if amount=entry.progress_percent and page is not distinct from entry.current_page and note='' then
   delete from public.reader_book_updates where id=operation and user_id=reader;
   return jsonb_build_object('noChange',true,'learningUsed',false);
  end if;
  if note<>'' and char_length(entry.notes||E'\n'||note)>2000 then raise exception 'Your private notes are full. Edit them before adding another note.' using errcode='22023'; end if;
  update public.user_books set progress_percent=amount,current_page=page,
    notes=case when note='' then notes else concat_ws(E'\n',nullif(notes,''),note) end,
    started_at=coalesce(started_at,current_date),finished_at=null where id=book_entry and user_id=reader;
 elsif action in('finish','dnf','reading_dates') then
  start_day:=(changes->>'startedAt')::date;
  end_day:=case when action='dnf' then (changes->>'stoppedAt')::date else (changes->>'finishedAt')::date end;
  if start_day>current_date+1 or end_day>current_date+1 or (start_day is not null and end_day<start_day) or (action in('finish','dnf') and end_day is null) then raise exception 'Check start and end dates' using errcode='22023'; end if;
  if action='finish' then
   if entry.status not in('reading','want_to_read','finished') then raise exception 'Restore this book before finishing' using errcode='40001'; end if;
   select coalesce(array_agg(distinct value),'{}'::text[]) into choices from jsonb_array_elements_text(changes->'feedback');
   if jsonb_typeof(changes->'feedback') is distinct from 'array' or jsonb_typeof(changes->'useForLearning') is distinct from 'boolean' or char_length(coalesce(changes->>'notes',''))>2000 then raise exception 'Invalid reflection' using errcode='22023'; end if;
   update public.user_books set status='finished',progress_percent=100,current_page=page_total,started_at=start_day,finished_at=end_day,
    rating=(changes->>'rating')::smallint,notes=coalesce(changes->>'notes',''),finish_feedback=choices,finish_use_for_learning=learning,
    rating_use_for_learning=learning,history_use_for_learning=learning,reflection_recorded_at=clock_timestamp(),
    dnf_use_for_learning=false where id=book_entry and user_id=reader;
  elsif action='dnf' then
   select coalesce(array_agg(distinct value),'{}'::text[]) into choices from jsonb_array_elements_text(changes->'reasons');
   if jsonb_typeof(changes->'reasons') is distinct from 'array' or jsonb_typeof(changes->'useForLearning') is distinct from 'boolean' or char_length(coalesce(changes->>'privateReason',''))>300 then raise exception 'Invalid reasons' using errcode='22023'; end if;
   update public.user_books set status='dnf',started_at=start_day,finished_at=null,stopped_at=end_day,dnf_reasons=choices,
    private_dnf_note=coalesce(changes->>'privateReason',''),dnf_reason=nullif(array_to_string(choices,', '),''),
    dnf_use_for_learning=learning and cardinality(choices)>0,dnf_recorded_at=clock_timestamp() where id=book_entry and user_id=reader;
  else
   if entry.status<>'finished' and end_day is not null then raise exception 'Finish date needs a finished book' using errcode='22023'; end if;
   if (changes->>'stoppedAt')::date>current_date+1 or (start_day is not null and (changes->>'stoppedAt')::date<start_day) then raise exception 'Check end date' using errcode='22023'; end if;
   update public.user_books set started_at=start_day,finished_at=end_day,stopped_at=(changes->>'stoppedAt')::date where id=book_entry and user_id=reader;
  end if;
 elsif action='restore_reading' then
  if entry.status<>'dnf' then raise exception 'Book is not in Graveyard' using errcode='40001'; end if;
  update public.user_books set status='reading',finished_at=null where id=book_entry and user_id=reader;
 elsif action='undo_reading' then
  select * into prior from public.reader_book_updates where id=(changes->>'updateId')::uuid and user_id=reader and user_book_id=book_entry for update;
  if not found or prior.undone or prior.after_updated_at is distinct from entry.updated_at then raise exception 'A newer change prevents Undo. Refresh the book.' using errcode='40001'; end if;
  if prior.kind='undo_reading' then raise exception 'Undo is already complete' using errcode='22023'; end if;
  if prior.kind='progress' then
   update public.user_books set progress_percent=(prior.before_state->>'progress_percent')::smallint,current_page=(prior.before_state->>'current_page')::integer,notes=prior.before_state->>'notes',started_at=(prior.before_state->>'started_at')::date,dnf_use_for_learning=case when prior.kind='dnf' then false else dnf_use_for_learning end where id=book_entry and user_id=reader;
  elsif prior.kind='finish' then
   -- Keep the reflection available, but remove this submission from learning.
   update public.user_books set status='reading',progress_percent=(prior.before_state->>'progress_percent')::smallint,current_page=(prior.before_state->>'current_page')::integer,
    started_at=(prior.before_state->>'started_at')::date,finished_at=null,rating_use_for_learning=false,history_use_for_learning=false,finish_use_for_learning=false where id=book_entry and user_id=reader;
  elsif prior.kind in('dnf','restore_reading') then
   update public.user_books set status=prior.before_state->>'status',finished_at=(prior.before_state->>'finished_at')::date,started_at=(prior.before_state->>'started_at')::date where id=book_entry and user_id=reader;
  elsif prior.kind='reading_dates' then
   update public.user_books set started_at=(prior.before_state->>'started_at')::date,finished_at=(prior.before_state->>'finished_at')::date,stopped_at=(prior.before_state->>'stopped_at')::date where id=book_entry and user_id=reader;
  end if;
  update public.reader_book_updates set undone=true where id=prior.id and user_id=reader;
 end if;
 select * into updated from public.user_books where id=book_entry and user_id=reader;
 update public.reader_book_updates set after_updated_at=updated.updated_at where id=operation and user_id=reader;
 outcome:=jsonb_build_object('operationId',operation,'learningUsed',coalesce(learning and settings.personalisation_enabled and
  ((action='finish' and ((settings.use_recent_ratings and (updated.rating is not null or cardinality(updated.finish_feedback)>0)) or settings.use_recent_history)) or
   (action='dnf' and settings.use_dnf_reasons and cardinality(array_remove(updated.dnf_reasons,'Not in the mood'))>0)),false));
 update public.reader_book_updates set result=outcome where id=operation and user_id=reader;
 return outcome;
end; $$;
revoke all on function public.save_reader_update(uuid,jsonb) from public,anon;
grant execute on function public.save_reader_update(uuid,jsonb) to authenticated;
grant delete on public.reader_book_updates to authenticated;
create policy reader_updates_delete on public.reader_book_updates for delete to authenticated using(user_id=auth.uid());

-- DNA refresh is replaced below to respect per-book consent and structured feedback.

create or replace function public.track_dna_influence() returns trigger language plpgsql set search_path='' as $$
begin
 if new.evidence is distinct from old.evidence and new.category in ('rating_genre','history_genre','finish_feedback','dnf_feedback') and new.source_type in ('rating','history','dnf') then return new; end if;
 if new.influence_state=old.influence_state then
  if not new.active then new.influence_state:='stopped';
  elsif new.internal_weight<old.internal_weight then new.influence_state:='reduced';
  elsif not old.active then new.influence_state:='normal'; end if;
 end if;
 return new;
end; $$;

create or replace function public.refresh_reading_activity() returns void language plpgsql security invoker set search_path='' as $$
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
   select u.id,u.rating,u.rating_recorded_at,u.reading_completed_at,u.rating_use_for_learning,u.history_use_for_learning,b.categories from public.user_books u join public.books b on b.id=u.book_id
    where u.user_id=reader and not u.is_removed
  ), facts as (
   select distinct a.id, a.rating, a.rating_recorded_at, a.reading_completed_at, a.rating_use_for_learning, a.history_use_for_learning, btrim(part) genre
   from activity a cross join lateral unnest(a.categories) c cross join lateral regexp_split_to_table(c,'/') part
   where char_length(btrim(part)) between 2 and 80 and lower(btrim(part)) not in ('fiction','general','nonfiction','non-fiction')
  ), evidence as (
   select 'rating_genre' category,case when rating>=4 then 'Higher ratings · ' else 'Lower ratings · ' end||genre label,'rating' source,
    jsonb_build_object('user_book_id',id,'occurred_at',rating_recorded_at,'rating',rating,'auto_activity',true) entry
   from facts where settings.personalisation_enabled and settings.use_recent_ratings and rating_use_for_learning and (rating>=4 or rating<=2) and (cutoff is null or rating_recorded_at>cutoff)
   union all
   select 'history_genre','Finished · '||genre,'history',jsonb_build_object('user_book_id',id,'occurred_at',reading_completed_at,'auto_activity',true)
   from facts where settings.personalisation_enabled and settings.use_recent_history and history_use_for_learning and reading_completed_at is not null and (cutoff is null or reading_completed_at>cutoff)
   union all
   select 'finish_feedback','Worked for me · '||choice,'rating',jsonb_build_object('user_book_id',u.id,'occurred_at',u.reflection_recorded_at,'reflection',true,'auto_activity',true)
   from public.user_books u cross join lateral unnest(u.finish_feedback) choice
   where u.user_id=reader and not u.is_removed and u.status='finished' and u.finish_use_for_learning
    and settings.personalisation_enabled and settings.use_recent_ratings and (cutoff is null or u.reflection_recorded_at>cutoff)
   union all
   select 'dnf_feedback','Did not finish · '||choice,'dnf',jsonb_build_object('user_book_id',u.id,'occurred_at',u.dnf_recorded_at,'reason',choice,'auto_activity',true)
   from public.user_books u cross join lateral unnest(u.dnf_reasons) choice
   where u.user_id=reader and not u.is_removed and u.status='dnf' and u.dnf_use_for_learning and choice<>'Not in the mood'
    and settings.personalisation_enabled and settings.use_dnf_reasons and (cutoff is null or u.dnf_recorded_at>cutoff)
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
 where s.user_id=reader and s.category in ('rating_genre','history_genre','finish_feedback','dnf_feedback') and s.source_type in ('rating','history','dnf')
  and s.evidence<>'[]'::jsonb and not ((s.category||chr(10)||s.label)=any(desired));
end; $$;

drop trigger user_books_activity_sync on public.user_books;
create trigger user_books_activity_sync after insert or delete or update of rating,status,is_removed,rating_use_for_learning,history_use_for_learning,finish_feedback,finish_use_for_learning,dnf_reasons,dnf_use_for_learning on public.user_books for each row execute function public.sync_reading_activity();
drop trigger ai_settings_activity_sync on public.ai_settings;
create trigger ai_settings_activity_sync after update of personalisation_enabled,use_recent_ratings,use_recent_history,use_dnf_reasons on public.ai_settings for each row execute function public.sync_reading_activity();
commit;
