-- ============================================================
-- VELA RLS BOUNDARY TEST - SINGLE RESULT TABLE
-- Run after the schema migration.
--
-- Replace the two UUID placeholders with two TEMPORARY
-- Supabase Auth user UUIDs.
--
-- This test runs inside a transaction and ends with ROLLBACK,
-- so seeded rows are removed automatically.
-- ============================================================

begin;

select set_config(
  'vela.test_user_a',
  'abd563cb-fdcc-4208-9e62-e1457a9df95e',
  true
);

select set_config(
  'vela.test_user_b',
  'dce88169-75db-43ef-8682-21949d0ab369',
  true
);

do $$
begin
  if not exists (
    select 1
    from auth.users
    where id = current_setting('vela.test_user_a')::uuid
  ) then
    raise exception 'USER A UUID does not exist in auth.users.';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = current_setting('vela.test_user_b')::uuid
  ) then
    raise exception 'USER B UUID does not exist in auth.users.';
  end if;
end;
$$;

create temp table vela_rls_results (
  test text not null,
  pass boolean not null
);

grant select, insert on vela_rls_results to authenticated;

-- ------------------------------------------------------------
-- Seed temporary data as SQL Editor/admin.
-- ------------------------------------------------------------

create temp table vela_test_book as
with upserted as (
  insert into public.books (
    google_books_id,
    title,
    authors,
    categories
  )
  values (
    'vela-rls-boundary-test-book',
    'Vela RLS Boundary Test Book',
    array['Test Author'],
    array['Test']
  )
  on conflict (google_books_id)
  do update set title = excluded.title
  returning id
)
select id from upserted;

insert into public.user_books (
  user_id,
  book_id,
  status,
  progress_percent
)
select current_setting('vela.test_user_a')::uuid, id, 'reading', 10
from vela_test_book;

insert into public.user_books (
  user_id,
  book_id,
  status,
  progress_percent
)
select current_setting('vela.test_user_b')::uuid, id, 'reading', 20
from vela_test_book;

insert into public.reading_dna_signals (
  user_id,
  category,
  label,
  internal_weight,
  source_type,
  evidence
)
values
(
  current_setting('vela.test_user_a')::uuid,
  'genre',
  'Fantasy A',
  0.800,
  'manual',
  '[]'::jsonb
),
(
  current_setting('vela.test_user_b')::uuid,
  'genre',
  'Fantasy B',
  0.700,
  'manual',
  '[]'::jsonb
);

insert into public.recommendation_sessions (
  user_id,
  request_text,
  candidate_google_books_ids,
  status
)
values
(
  current_setting('vela.test_user_a')::uuid,
  'Test request A',
  array['vela-rls-boundary-test-book'],
  'completed'
),
(
  current_setting('vela.test_user_b')::uuid,
  'Test request B',
  array['vela-rls-boundary-test-book'],
  'completed'
);

insert into public.recommendations (
  user_id,
  session_id,
  book_id,
  rank,
  reason,
  matched_signals,
  confidence_label
)
select
  s.user_id,
  s.id,
  b.id,
  1,
  'Test recommendation',
  '[]'::jsonb,
  'good_match'
from public.recommendation_sessions s
cross join vela_test_book b
where s.request_text in ('Test request A', 'Test request B');

insert into public.recommendation_feedback (
  user_id,
  recommendation_id,
  feedback,
  reason
)
select
  r.user_id,
  r.id,
  'helpful',
  'Boundary test'
from public.recommendations r
join public.recommendation_sessions s
  on s.id = r.session_id
where s.request_text in ('Test request A', 'Test request B');

-- ------------------------------------------------------------
-- Simulate authenticated USER A.
-- ------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('vela.test_user_a'),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

insert into vela_rls_results
select
  'A sees own profile',
  count(*) = 1
from public.profiles
where id = current_setting('vela.test_user_a')::uuid;

insert into vela_rls_results
select
  'A cannot see B profile',
  count(*) = 0
from public.profiles
where id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A sees own Library row',
  count(*) = 1
from public.user_books
where user_id = current_setting('vela.test_user_a')::uuid;

insert into vela_rls_results
select
  'A cannot see B user_books',
  count(*) = 0
from public.user_books
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A cannot see B Reading DNA',
  count(*) = 0
from public.reading_dna_signals
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A cannot see B recommendation sessions',
  count(*) = 0
from public.recommendation_sessions
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A cannot see B recommendations',
  count(*) = 0
from public.recommendations
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A cannot see B feedback',
  count(*) = 0
from public.recommendation_feedback
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A cannot see B AI settings',
  count(*) = 0
from public.ai_settings
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'A can read shared book metadata',
  count(*) = 1
from public.books
where google_books_id = 'vela-rls-boundary-test-book';

with changed as (
  update public.user_books
  set progress_percent = 99
  where user_id = current_setting('vela.test_user_b')::uuid
  returning id
)
insert into vela_rls_results
select
  'A cannot update B user_books',
  count(*) = 0
from changed;

with removed as (
  delete from public.reading_dna_signals
  where user_id = current_setting('vela.test_user_b')::uuid
  returning id
)
insert into vela_rls_results
select
  'A cannot delete B Reading DNA',
  count(*) = 0
from removed;

do $$
begin
  begin
    insert into public.reading_dna_signals (
      user_id,
      category,
      label,
      internal_weight,
      source_type
    )
    values (
      current_setting('vela.test_user_b')::uuid,
      'genre',
      'This insert must be blocked',
      0.500,
      'manual'
    );

    insert into vela_rls_results
    values ('A cannot insert Reading DNA owned by B', false);

  exception
    when sqlstate '42501' then
      insert into vela_rls_results
      values ('A cannot insert Reading DNA owned by B', true);
  end;
end;
$$;

reset role;

-- ------------------------------------------------------------
-- Simulate authenticated USER B.
-- ------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('vela.test_user_b'),
    'role', 'authenticated'
  )::text,
  true
);

set local role authenticated;

insert into vela_rls_results
select
  'B sees own Library row',
  count(*) = 1
from public.user_books
where user_id = current_setting('vela.test_user_b')::uuid;

insert into vela_rls_results
select
  'B cannot see A user_books',
  count(*) = 0
from public.user_books
where user_id = current_setting('vela.test_user_a')::uuid;

insert into vela_rls_results
select
  'B cannot see A Reading DNA',
  count(*) = 0
from public.reading_dna_signals
where user_id = current_setting('vela.test_user_a')::uuid;

insert into vela_rls_results
select
  'B cannot see A recommendations',
  count(*) = 0
from public.recommendations
where user_id = current_setting('vela.test_user_a')::uuid;

reset role;

-- ------------------------------------------------------------
-- SINGLE RESULT SET
-- Every individual row should be TRUE.
-- The final ALL TESTS PASSED row should also be TRUE.
-- ------------------------------------------------------------

select test, pass
from vela_rls_results

union all

select
  'ALL TESTS PASSED',
  bool_and(pass)
from vela_rls_results

order by test;

rollback;
