-- VELA INITIAL DATABASE SCHEMA + RLS
-- 202609220001_initial_schema_rls.sql

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Reader',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 60)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2. books: shared Google Books metadata cache
create table public.books (
  id uuid primary key default gen_random_uuid(),
  google_books_id text not null unique,
  title text not null,
  authors text[] not null default '{}'::text[],
  description text,
  page_count integer,
  categories text[] not null default '{}'::text[],
  published_date text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_google_id_not_blank check (char_length(btrim(google_books_id)) > 0),
  constraint books_title_not_blank check (char_length(btrim(title)) > 0),
  constraint books_page_count_nonnegative check (page_count is null or page_count >= 0)
);

create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

-- 3. user_books: Library CRUD backbone
create table public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  book_id uuid not null
    references public.books(id) on delete restrict,

  status text not null default 'want_to_read',
  progress_percent smallint not null default 0,
  rating smallint,
  dnf_reason text,
  dnf_use_for_learning boolean not null default false,
  started_at date,
  finished_at date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_books_one_copy_per_reader unique (user_id, book_id),
  constraint user_books_status_valid
    check (status in ('want_to_read', 'reading', 'finished', 'dnf')),
  constraint user_books_progress_valid
    check (progress_percent between 0 and 100),
  constraint user_books_rating_valid
    check (rating is null or rating between 1 and 5),
  constraint user_books_dnf_reason_length
    check (dnf_reason is null or char_length(dnf_reason) <= 500),
  constraint user_books_learning_requires_reason
    check (not dnf_use_for_learning or dnf_reason is not null)
);

create trigger user_books_set_updated_at
before update on public.user_books
for each row execute function public.set_updated_at();

create index user_books_book_id_idx on public.user_books(book_id);
create index user_books_status_idx on public.user_books(user_id, status);

-- 4. reading_dna_signals
create table public.reading_dna_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,

  category text not null,
  label text not null,
  internal_weight numeric(4,3) not null default 0.500,
  source_type text not null default 'manual',
  evidence jsonb not null default '[]'::jsonb,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reading_dna_signal_unique unique (user_id, category, label),
  constraint reading_dna_category_not_blank check (char_length(btrim(category)) > 0),
  constraint reading_dna_label_not_blank check (char_length(btrim(label)) > 0),
  constraint reading_dna_weight_valid check (internal_weight between 0 and 1),
  constraint reading_dna_source_valid
    check (source_type in ('onboarding','rating','dnf','correction','manual','mixed')),
  constraint reading_dna_evidence_shape
    check (jsonb_typeof(evidence) in ('array', 'object'))
);

create trigger reading_dna_signals_set_updated_at
before update on public.reading_dna_signals
for each row execute function public.set_updated_at();

alter table public.reading_dna_signals
  add constraint reading_dna_signals_id_user_unique unique (id, user_id);

-- 5. recommendation_sessions
create table public.recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,

  request_text text not null,
  filters jsonb not null default '{}'::jsonb,
  permitted_signals jsonb not null default '[]'::jsonb,
  candidate_google_books_ids text[] not null default '{}'::text[],
  status text not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recommendation_sessions_request_length
    check (char_length(btrim(request_text)) between 2 and 500),
  constraint recommendation_sessions_status_valid
    check (status in ('pending', 'completed', 'failed')),
  constraint recommendation_sessions_filters_shape
    check (jsonb_typeof(filters) = 'object'),
  constraint recommendation_sessions_signals_shape
    check (jsonb_typeof(permitted_signals) = 'array')
);

create trigger recommendation_sessions_set_updated_at
before update on public.recommendation_sessions
for each row execute function public.set_updated_at();

create index recommendation_sessions_user_id_idx
  on public.recommendation_sessions(user_id);

alter table public.recommendation_sessions
  add constraint recommendation_sessions_id_user_unique unique (id, user_id);

-- 6. recommendations
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,

  session_id uuid not null,
  book_id uuid not null references public.books(id) on delete restrict,

  rank smallint not null,
  reason text not null,
  matched_signals jsonb not null default '[]'::jsonb,
  confidence_label text not null,

  created_at timestamptz not null default now(),

  constraint recommendations_session_owner_fk
    foreign key (session_id, user_id)
    references public.recommendation_sessions(id, user_id)
    on delete cascade,

  constraint recommendations_rank_valid check (rank between 1 and 3),
  constraint recommendations_confidence_valid
    check (confidence_label in ('strong_match', 'good_match', 'experimental')),
  constraint recommendations_reason_length
    check (char_length(btrim(reason)) between 1 and 500),
  constraint recommendations_matched_signals_shape
    check (jsonb_typeof(matched_signals) = 'array'),
  constraint recommendations_unique_rank unique (session_id, rank),
  constraint recommendations_unique_book_per_session unique (session_id, book_id)
);

create index recommendations_user_id_idx on public.recommendations(user_id);
create index recommendations_book_id_idx on public.recommendations(book_id);

alter table public.recommendations
  add constraint recommendations_id_user_unique unique (id, user_id);

-- 7. recommendation_feedback
create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,

  recommendation_id uuid not null,
  feedback text not null,
  reason text,
  corrected_signal_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recommendation_feedback_recommendation_owner_fk
    foreign key (recommendation_id, user_id)
    references public.recommendations(id, user_id)
    on delete cascade,

  constraint recommendation_feedback_signal_owner_fk
    foreign key (corrected_signal_id, user_id)
    references public.reading_dna_signals(id, user_id)
    on delete set null (corrected_signal_id),

  constraint recommendation_feedback_one_per_recommendation unique (recommendation_id),
  constraint recommendation_feedback_value_valid
    check (feedback in ('helpful', 'not_for_me')),
  constraint recommendation_feedback_reason_length
    check (reason is null or char_length(reason) <= 250)
);

create trigger recommendation_feedback_set_updated_at
before update on public.recommendation_feedback
for each row execute function public.set_updated_at();

create index recommendation_feedback_user_id_idx
  on public.recommendation_feedback(user_id);

-- 8. ai_settings
create table public.ai_settings (
  user_id uuid primary key default auth.uid()
    references public.profiles(id) on delete cascade,

  personalisation_enabled boolean not null default true,
  use_recent_ratings boolean not null default true,
  use_dnf_reasons boolean not null default false,
  use_recent_history boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ai_settings_set_updated_at
before update on public.ai_settings
for each row execute function public.set_updated_at();

-- Auth user -> application profile/settings
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_display_name text;
begin
  safe_display_name :=
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        'Reader'
      ),
      60
    );

  insert into public.profiles (id, display_name)
  values (new.id, safe_display_name)
  on conflict (id) do nothing;

  insert into public.ai_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill any users created before this migration.
insert into public.profiles (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      'Reader'
    ),
    60
  )
from auth.users u
on conflict (id) do nothing;

insert into public.ai_settings (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

-- Least-privilege grants
grant usage on schema public to authenticated;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.books from anon, authenticated;
revoke all on table public.user_books from anon, authenticated;
revoke all on table public.reading_dna_signals from anon, authenticated;
revoke all on table public.recommendation_sessions from anon, authenticated;
revoke all on table public.recommendations from anon, authenticated;
revoke all on table public.recommendation_feedback from anon, authenticated;
revoke all on table public.ai_settings from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert on table public.books to authenticated;
grant select, insert, update, delete on table public.user_books to authenticated;
grant select, insert, update, delete on table public.reading_dna_signals to authenticated;
grant select, insert, update, delete on table public.recommendation_sessions to authenticated;
grant select, insert on table public.recommendations to authenticated;
grant select, insert, update, delete on table public.recommendation_feedback to authenticated;
grant select, update on table public.ai_settings to authenticated;

-- Enable RLS everywhere in the exposed public schema.
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.user_books enable row level security;
alter table public.reading_dna_signals enable row level security;
alter table public.recommendation_sessions enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.ai_settings enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- books: shared non-personal metadata
create policy "books_select_authenticated"
on public.books for select to authenticated
using (true);

create policy "books_insert_authenticated"
on public.books for insert to authenticated
with check (true);

-- user_books
create policy "user_books_select_own"
on public.user_books for select to authenticated
using ((select auth.uid()) = user_id);

create policy "user_books_insert_own"
on public.user_books for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_books_update_own"
on public.user_books for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_books_delete_own"
on public.user_books for delete to authenticated
using ((select auth.uid()) = user_id);

-- reading_dna_signals
create policy "reading_dna_select_own"
on public.reading_dna_signals for select to authenticated
using ((select auth.uid()) = user_id);

create policy "reading_dna_insert_own"
on public.reading_dna_signals for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "reading_dna_update_own"
on public.reading_dna_signals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "reading_dna_delete_own"
on public.reading_dna_signals for delete to authenticated
using ((select auth.uid()) = user_id);

-- recommendation_sessions
create policy "recommendation_sessions_select_own"
on public.recommendation_sessions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "recommendation_sessions_insert_own"
on public.recommendation_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "recommendation_sessions_update_own"
on public.recommendation_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "recommendation_sessions_delete_own"
on public.recommendation_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

-- recommendations: immutable AI output
create policy "recommendations_select_own"
on public.recommendations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "recommendations_insert_own"
on public.recommendations for insert to authenticated
with check ((select auth.uid()) = user_id);

-- recommendation_feedback
create policy "recommendation_feedback_select_own"
on public.recommendation_feedback for select to authenticated
using ((select auth.uid()) = user_id);

create policy "recommendation_feedback_insert_own"
on public.recommendation_feedback for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "recommendation_feedback_update_own"
on public.recommendation_feedback for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "recommendation_feedback_delete_own"
on public.recommendation_feedback for delete to authenticated
using ((select auth.uid()) = user_id);

-- ai_settings
create policy "ai_settings_select_own"
on public.ai_settings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "ai_settings_update_own"
on public.ai_settings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
