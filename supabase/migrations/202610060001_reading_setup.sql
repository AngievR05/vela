-- Reading setup is one atomic, reader-scoped operation. Never accepts an owner ID.
alter table public.profiles
  add column reading_setup_preferences jsonb not null default '{"genres":[],"storyElements":[],"pacing":"","moods":[]}'::jsonb,
  add column reading_setup_completed_at timestamptz;

-- New readers must explicitly opt into each optional data source.
alter table public.ai_settings alter column personalisation_enabled set default false;
alter table public.ai_settings alter column use_recent_ratings set default false;
alter table public.ai_settings alter column use_recent_history set default false;

create function public.save_reading_setup(choices jsonb, permissions jsonb, enabled boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  reader uuid := auth.uid();
  pair record;
  selected jsonb;
  selected_label text;
  allowed text[];
  category_name text;
begin
  if reader is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if choices is null or permissions is null or enabled is null
    or jsonb_typeof(choices) <> 'object' or jsonb_typeof(permissions) <> 'object'
    or not (choices ?& array['genres','storyElements','pacing','moods'])
    or choices - array['genres','storyElements','pacing','moods'] <> '{}'::jsonb
    or not (permissions ?& array['ratings','dnf','history'])
    or permissions - array['ratings','dnf','history'] <> '{}'::jsonb
  then raise exception 'Invalid setup' using errcode = '22023'; end if;
  for pair in select key, value from jsonb_each(permissions) loop
    if jsonb_typeof(pair.value) <> 'boolean' or (not enabled and pair.value = 'true'::jsonb)
    then raise exception 'Invalid permissions' using errcode = '22023'; end if;
  end loop;
  -- Validate all choices before any writes, including direct RPC requests.
  for pair in select key, value from jsonb_each(choices) loop
    case pair.key
      when 'genres' then allowed := array['Fantasy','Science fiction','Mystery','Romance','Literary fiction','Historical','Horror','Non-fiction'];
      when 'storyElements' then allowed := array['Character-led','Found family','Slow burn','Political intrigue','Mystery','High stakes','Humour','Quiet reflection'];
      when 'pacing' then allowed := array['Slow and immersive','Steady','Fast start','Relentless'];
      when 'moods' then allowed := array['Reflective','Comforting','Adventurous','Dark','Hopeful','Easy to resume'];
    end case;
    if pair.key = 'pacing' then
      if jsonb_typeof(pair.value) <> 'string' or (pair.value #>> '{}' <> '' and not ((pair.value #>> '{}') = any(allowed)))
      then raise exception 'Invalid pacing' using errcode = '22023'; end if;
    else
      if jsonb_typeof(pair.value) <> 'array' then raise exception 'Invalid selections' using errcode = '22023'; end if;
      if exists(select 1 from jsonb_array_elements(pair.value) item where jsonb_typeof(item) <> 'string' or not ((item #>> '{}') = any(allowed)))
        or (select count(*) from jsonb_array_elements(pair.value)) <> (select count(distinct item) from jsonb_array_elements(pair.value) item)
      then raise exception 'Invalid selections' using errcode = '22023'; end if;
    end if;
  end loop;
  -- Serialize concurrent saves for the same reader; all writes still obey RLS.
  perform 1 from public.profiles where id = reader for update;
  if not found then raise exception 'Reader profile unavailable' using errcode = '42501'; end if;
  update public.profiles set reading_setup_preferences = choices, reading_setup_completed_at = now() where id = reader;
  update public.ai_settings set personalisation_enabled = enabled,
    use_recent_ratings = (permissions->>'ratings')::boolean,
    use_dnf_reasons = (permissions->>'dnf')::boolean,
    use_recent_history = (permissions->>'history')::boolean where user_id = reader;
  if not found then raise exception 'Reader settings unavailable' using errcode = '42501'; end if;
  -- Deactivate old onboarding signals without deleting evidence references or learned/manual signals.
  update public.reading_dna_signals set active = false where user_id = reader and source_type = 'onboarding'
    and category in ('genre','story_element','pacing','mood');
  for pair in select key, value from jsonb_each(choices) loop
    category_name := case pair.key when 'genres' then 'genre' when 'storyElements' then 'story_element' when 'pacing' then 'pacing' else 'mood' end;
    selected := case when pair.key = 'pacing' then case when pair.value #>> '{}' = '' then '[]'::jsonb else jsonb_build_array(pair.value) end else pair.value end;
    for selected_label in select jsonb_array_elements_text(selected) loop
      insert into public.reading_dna_signals(user_id, category, label, source_type)
        values (reader, category_name, selected_label, 'onboarding')
        on conflict (user_id, category, label) do update set active = true
        where reading_dna_signals.source_type = 'onboarding';
    end loop;
  end loop;
end;
$$;
revoke all on function public.save_reading_setup(jsonb, jsonb, boolean) from public, anon;
grant execute on function public.save_reading_setup(jsonb, jsonb, boolean) to authenticated;
