-- Reading DNA corrections, durable Undo and a reset that preserves explicit preferences.
begin;
alter table public.profiles add column reading_dna_reset_at timestamptz;
alter table public.reading_dna_signals add column influence_state text not null default 'normal'
  check(influence_state in ('normal','reduced','stopped'));
update public.reading_dna_signals set influence_state='stopped' where not active;

create function public.track_dna_influence() returns trigger language plpgsql set search_path='' as $$
begin
  if new.influence_state=old.influence_state then
    if not new.active then new.influence_state:='stopped';
    elsif new.internal_weight<old.internal_weight then new.influence_state:='reduced';
    elsif not old.active then new.influence_state:='normal'; end if;
  end if;
  return new;
end; $$;
create trigger reading_dna_influence before update on public.reading_dna_signals
  for each row execute function public.track_dna_influence();

create table public.reading_dna_changes(
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  signal_id uuid,
  action text not null check(action in ('keep','reduce','remove','undo','reset')),
  previous_state jsonb not null default '{}'::jsonb,
  saved_at timestamptz,
  undone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(signal_id,user_id) references public.reading_dna_signals(id,user_id) on delete cascade,
  check(jsonb_typeof(previous_state)='object')
);
create index reading_dna_changes_reader on public.reading_dna_changes(user_id,created_at desc);
create trigger reading_dna_changes_updated before update on public.reading_dna_changes
  for each row execute function public.set_updated_at();
alter table public.reading_dna_changes enable row level security;
create policy reading_dna_changes_own on public.reading_dna_changes for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (signal_id is null or exists(select 1 from public.reading_dna_signals s where s.id=reading_dna_changes.signal_id and s.user_id=(select auth.uid()))));
revoke all on public.reading_dna_changes from public,anon;
grant select,insert,update,delete on public.reading_dna_changes to authenticated;

create function public.change_reading_dna(operation uuid,signal_key uuid,action text,expected timestamptz,undo_key uuid default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); signal public.reading_dna_signals%rowtype; prior public.reading_dna_changes%rowtype; replay public.reading_dna_changes%rowtype; saved timestamptz;
begin
  if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if operation is null or action is null or action not in ('keep','reduce','remove','undo') then raise exception 'Invalid change' using errcode='22023'; end if;
  -- Serialize corrections and resets for this reader, never across readers.
  perform id from public.profiles where id=reader for update;
  select * into replay from public.reading_dna_changes where id=operation and user_id=reader;
  if found then
    if replay.action<>action or (action<>'undo' and replay.signal_id is distinct from signal_key)
      or (action='undo' and replay.previous_state->>'undo_key' is distinct from undo_key::text) then raise exception 'Operation changed' using errcode='22023'; end if;
    return replay.id;
  end if;
  if action='undo' then
    select * into prior from public.reading_dna_changes c where c.id=undo_key and c.user_id=reader and c.action in ('keep','reduce','remove') for update;
    if not found or prior.undone then raise exception 'Undo unavailable' using errcode='40001'; end if;
    signal_key:=prior.signal_id;
  end if;
  select * into signal from public.reading_dna_signals where id=signal_key and user_id=reader for update;
  if not found then raise exception 'Signal unavailable' using errcode='42501'; end if;
  if (action='undo' and signal.updated_at is distinct from prior.saved_at)
    or (action<>'undo' and (expected is null or signal.updated_at is distinct from expected)) then raise exception 'Signal changed' using errcode='40001'; end if;
  if action='undo' then
    update public.reading_dna_signals set active=(prior.previous_state->>'active')::boolean,
      internal_weight=(prior.previous_state->>'weight')::numeric,influence_state=prior.previous_state->>'influence'
      where id=signal_key and user_id=reader returning updated_at into saved;
    update public.reading_dna_changes set undone=true where id=undo_key and user_id=reader;
  else
    update public.reading_dna_signals set
      active=action<>'remove',
      internal_weight=case when action='reduce' then internal_weight/2 when action='keep' and internal_weight=0 then 0.5 else internal_weight end,
      influence_state=case when action='remove' then 'stopped' when action='reduce' then 'reduced' when not signal.active then 'normal' else influence_state end
      where id=signal_key and user_id=reader returning updated_at into saved;
  end if;
  insert into public.reading_dna_changes(id,user_id,signal_id,action,previous_state,saved_at)
    values(operation,reader,signal_key,action,case when action='undo' then jsonb_build_object('undo_key',undo_key)
      else jsonb_build_object('active',signal.active,'weight',signal.internal_weight,'influence',signal.influence_state) end,saved);
  return operation;
end; $$;

create function public.reset_reading_dna(operation uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare reader uuid:=auth.uid(); choices jsonb; reset_time timestamptz:=clock_timestamp();
begin
  if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if operation is null then raise exception 'Invalid reset' using errcode='22023'; end if;
  select reading_setup_preferences into choices from public.profiles where id=reader for update;
  if exists(select 1 from public.reading_dna_changes where id=operation and user_id=reader and action='reset') then return operation; end if;
  if exists(select 1 from public.reading_dna_changes where id=operation and user_id=reader) then raise exception 'Operation changed' using errcode='22023'; end if;
  -- Clear learned signals and corrections; historical Library and recommendation records remain.
  update public.recommendation_feedback set corrected_signal_id=null,correction_action=null,preference_effect=null where user_id=reader;
  delete from public.reading_dna_changes where user_id=reader and action<>'reset';
  delete from public.reading_dna_signals where user_id=reader and source_type not in ('onboarding','manual');
  update public.reading_dna_signals set internal_weight=0.5,influence_state='normal',active=case
    when source_type='manual' then true
    when category='genre' then coalesce(choices->'genres','[]'::jsonb)?label
    when category='story_element' then coalesce(choices->'storyElements','[]'::jsonb)?label
    when category='mood' then coalesce(choices->'moods','[]'::jsonb)?label
    when category='pacing' then coalesce(choices->>'pacing','')=label else active end
    where user_id=reader;
  update public.profiles set reading_dna_reset_at=reset_time where id=reader;
  insert into public.reading_dna_changes(id,user_id,action)values(operation,reader,'reset');
  return operation;
end; $$;
revoke all on function public.change_reading_dna(uuid,uuid,text,timestamptz,uuid) from public,anon;
revoke all on function public.reset_reading_dna(uuid) from public,anon;
grant execute on function public.change_reading_dna(uuid,uuid,text,timestamptz,uuid) to authenticated;
grant execute on function public.reset_reading_dna(uuid) to authenticated;
create or replace function public.save_reader_settings(change jsonb)
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
    perform public.reset_reading_dna(pg_catalog.gen_random_uuid());
  else raise exception 'Invalid settings operation' using errcode='22023'; end if;
end; $$;
commit;

