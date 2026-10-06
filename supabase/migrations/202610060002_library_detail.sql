-- Library, Add Book and Book Detail. Additive; no existing reader data is removed.
begin;
alter table public.books add column if not exists created_by uuid references public.profiles(id) on delete cascade;
alter table public.books add column if not exists isbn text;
alter table public.user_books add column if not exists is_favourite boolean not null default false;
alter table public.user_books add column if not exists notes text not null default '';
alter table public.user_books add column if not exists current_page integer;
alter table public.user_books add column if not exists is_removed boolean not null default false;
alter table public.user_books add constraint user_books_notes_length check (char_length(notes) <= 2000);
alter table public.user_books add constraint user_books_current_page_nonnegative check (current_page is null or current_page >= 0);
alter table public.books add constraint books_manual_owner check ((google_books_id like 'manual:%') = (created_by is not null));

-- Google metadata is shared. A reader's manual book metadata is private.
drop policy "books_select_authenticated" on public.books;
create policy "books_select_authenticated" on public.books for select to authenticated
using (created_by is null or created_by = (select auth.uid()));
drop policy "books_insert_authenticated" on public.books;
create policy "books_insert_authenticated" on public.books for insert to authenticated
with check (created_by is null or created_by = (select auth.uid()));
drop policy "user_books_insert_own" on public.user_books;
create policy "user_books_insert_own" on public.user_books for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.books b where b.id = book_id));
drop policy "user_books_update_own" on public.user_books;
create policy "user_books_update_own" on public.user_books for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and exists (select 1 from public.books b where b.id = book_id));

create function public.add_manual_book(entry_id uuid, book_title text, book_author text, book_isbn text default null,
  total_pages integer default null, cover_url text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare reader_id uuid := auth.uid(); metadata_id uuid; library_id uuid;
begin
  if reader_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if entry_id is null or book_title is null or book_author is null
    or char_length(btrim(book_title)) not between 1 and 300 or char_length(btrim(book_author)) not between 1 and 200
    or (book_isbn is not null and book_isbn !~ '^([0-9]{13}|[0-9]{9}[0-9X])$')
    or (total_pages is not null and (total_pages < 1 or total_pages > 100000))
    or (cover_url is not null and (char_length(cover_url) > 2000 or cover_url !~ '^https://(books[.]google[.]com|books[.]googleusercontent[.]com)/'))
  then raise exception 'Invalid manual book' using errcode = '22023'; end if;
  insert into public.books(google_books_id,title,authors,isbn,page_count,thumbnail_url,created_by)
    values ('manual:' || entry_id::text,btrim(book_title),array[btrim(book_author)],book_isbn,total_pages,cover_url,reader_id)
    on conflict (google_books_id) do nothing;
  select id into metadata_id from public.books where google_books_id = 'manual:' || entry_id::text and created_by = reader_id;
  if metadata_id is null then raise exception 'Unable to save manual book' using errcode = '42501'; end if;
  insert into public.user_books(user_id,book_id,status) values (reader_id,metadata_id,'want_to_read')
    on conflict (user_id,book_id) do nothing;
  select id into library_id from public.user_books where user_id = reader_id and book_id = metadata_id;
  return library_id;
end;
$$;
revoke all on function public.add_manual_book(uuid,text,text,text,integer,text) from public, anon;
grant execute on function public.add_manual_book(uuid,text,text,text,integer,text) to authenticated;
commit;
