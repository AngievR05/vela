-- Optional reader-recorded facts for reading charts. Existing library data is preserved.
begin;
create table public.reader_book_stats (
  id uuid primary key references public.user_books(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reading_format text check (reading_format in ('Print','Ebook','Audiobook')),
  primary_genre text not null default '' check (char_length(primary_genre) <= 80),
  moods text[] not null default '{}' check (cardinality(moods) <= 6 and moods <@ array['Adventurous','Emotional','Reflective','Cosy','Dark','Hopeful']),
  story_pace text check (story_pace in ('Slow','Medium','Fast')),
  updated_at timestamptz not null default now()
);
alter table public.reader_book_stats enable row level security;
revoke all on public.reader_book_stats from public,anon;
grant select,insert,update,delete on public.reader_book_stats to authenticated;
create policy reading_stats_own on public.reader_book_stats for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.user_books b where b.id = reader_book_stats.id and b.user_id = (select auth.uid())));
create trigger reader_book_stats_updated before update on public.reader_book_stats for each row execute function public.set_updated_at();
create index reader_book_stats_user_idx on public.reader_book_stats(user_id);

create function public.save_reading_record(book_entry uuid, changes jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  reader uuid := auth.uid();
  entry public.user_books%rowtype;
  finish_day date;
  tags text[];
begin
  if reader is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if jsonb_typeof(changes) <> 'object' or not (changes ?& array['finishedAt','format','primaryGenre','moods','pace','expectedUpdatedAt'])
    or changes - array['finishedAt','format','primaryGenre','moods','pace','expectedUpdatedAt'] <> '{}'::jsonb
    or jsonb_typeof(changes->'moods') <> 'array' or jsonb_typeof(changes->'primaryGenre') <> 'string'
    or jsonb_typeof(changes->'expectedUpdatedAt') <> 'string'
    then raise exception 'Invalid record'; end if;
  select * into entry from public.user_books where id=book_entry and user_id=reader and not is_removed for update;
  if not found or entry.status <> 'finished' then raise exception 'Finished book unavailable' using errcode='42501'; end if;
  if entry.updated_at <> (changes->>'expectedUpdatedAt')::timestamptz then raise exception 'Book changed' using errcode='40001'; end if;
  finish_day := (changes->>'finishedAt')::date;
  if finish_day > current_date or (entry.started_at is not null and finish_day < entry.started_at)
    then raise exception 'Check finish date'; end if;
  select coalesce(array_agg(distinct value),'{}'::text[]) into tags from jsonb_array_elements_text(changes->'moods');
  insert into public.reader_book_stats(id,user_id,reading_format,primary_genre,moods,story_pace)
    values(book_entry,reader,changes->>'format',btrim(changes->>'primaryGenre'),tags,changes->>'pace')
    on conflict(id) do update set reading_format=excluded.reading_format,primary_genre=excluded.primary_genre,moods=excluded.moods,story_pace=excluded.story_pace;
  update public.user_books set finished_at=finish_day where id=book_entry and user_id=reader;
end;
$$;
revoke all on function public.save_reading_record(uuid,jsonb) from public,anon;
grant execute on function public.save_reading_record(uuid,jsonb) to authenticated;
commit;
