# Testing and verification

Reviewed 21 October 2026. [README](../README.md) · [API contracts](API.md) · [deployment acceptance](DEPLOYMENT.md#production-smoke-test).

Current deployment verification: **78 tests passed**, lint/build passed, and [Vercel production](https://vela-sepia-nine.vercel.app) passed public/authorization and controlled-reader login/reload/logout checks. Sixteen authenticated page/viewport combinations passed at 390/1440px; Google Books recovered after a transient upstream failure and the production Gemini book-clue check succeeded. See [deployment evidence and remaining acceptance limits](evidence/production-deployment-2026-10-21.json). Production email delivery and new hosted write/RLS tests are not implied by these read-only checks.

The later [expanded production QA](PRODUCTION_QA_2026-10-21.md) adds real disposable-reader saves/Undo, CSV cover import, preferences, stats/export, recommendation feedback, opt-out, direct read isolation across ten private tables, and owner-confirmed production reset-email receipt. It also fixes and rechecks the obsolete-reading-update timeout. New non-team signup/confirmation and a complete password-change cycle remain unverified; existing hosted readers were not deleted or irreversibly reset.

## Repeatable commands

Install the locked dependencies with `npm ci`. Then run:

```bash
npm test
npm run lint
npm run build
```

`npm test` runs `node --test tests/*.test.mjs`. Domain tests and PGlite SQL tests use local fixtures/stubbed provider responses; they do not need a real user's password, a service-role key or live paid API calls. They do need the installed packages and enough memory/time for PostgreSQL instances.

Lint checks application/config/test source and excludes generated `.next`, output/build/coverage and ignored `.temp` artifacts. Production build requires valid public Supabase environment configuration because the application validates it. A successful build is not a live database migration or provider-availability check. Use `npm run start` to serve the completed production build locally.

The **final cleanup run** passed **71 tests, 0 failures**, lint and production build (36 generated pages). The 122 baseline RLS and 142 full-schema privacy/reset/deletion assertions run inside those tests; do not add them to the test-case count. Existing non-failing Node module-type auto-detection warnings are recorded. [Release evidence](evidence/release-cleanup-2026-10-21.json).

## Automated coverage

| Area | What the suite verifies |
| --- | --- |
| Auth | Input rules, safe local redirects, temporary errors versus invalid sessions, reset verification, PKCE/session handling and identity checks |
| Library/reading | Ownership, transitions, exact progress, dates, operation retries, stale versions, Undo, saved reflection and duplicate preservation |
| CSV/covers | Goodreads/StoryGraph parsing, malformed rows, valid ISBNs/work identity, safe Google image URLs, recovery/backoff and reader-private cover denial |
| Recommendations | Request boundary, verified candidates/IDs/quotes, distinct works, retryable partial outage, atomic session saves and feedback/correction isolation |
| DNA | Automatic refresh, independent permissions, per-book consent, stopped/reduced controls, reset cutoff and Library-preserving reset |
| Stats/settings | Date/denominator rules, facts, preference synchronization, reminder rules, exports/import operations and guarded deletion |
| Quotas/privacy | Default-closed Gemini gate, approved models, bounded retries, simulated 429/503 paths and private-field minimization |
| PostgreSQL | Checked-in migrations with Auth-role emulation; anonymous and two-reader denial, spoofed parent ownership, reset/deletion scope |

Zod and domain tests complement actual SQL execution. PGlite omits an unused extension where necessary, emulates Auth roles/claims and exercises policies/functions; it does not reproduce every hosted Supabase service or infrastructure setting.

## Browser and hosted evidence

| Evidence | Scope |
| --- | --- |
| [Authentication](evidence/auth-verification-2026-10-13.json) and [test-account guide](authentication-test-accounts.md) | Controlled signup activation, login, session/logout and email receipt; see recorded remaining reset checks |
| [Functional audit](evidence/functional-audit-2026-10-19.json) | 22 hosted disposable-reader API checks; no owner Library changes |
| [CSV cover verification](evidence/csv-cover-verification-2026-10-20.json) | Seven disposable hosted checks plus loaded real imported covers; main catalogue outage recorded separately |
| [Responsive evidence](evidence/responsive-verification-2026-10-20.json) and [review](responsive-verification.md) | 208 layout/state checks across representative widths/short-height views; browser viewport checks, not physical devices |
| [Prototype update](evidence/prototype-update-2026-10-21.json) | Read-only graph review, real saved identities/covers, ten updated Explore layout checks and isolated Save/Undo/error paths |
| [Hosted recommendation evaluation](recommendation-evaluation-2026-10-17.md) | Request relevance, feedback/consent/correction evidence with explicit failures/limits |
| [Quota/security audit](security-quota-audit-2026-10-18.md) | Simulated service degradation, privacy/RLS and dependency findings at that date |

Temporary UI fixtures isolate state/error transitions and are removed from application routes after verification. Their successful simulated save is not reported as a hosted save. Product screenshots under `docs/images` are visual documentation, not proof of every flow's acceptance.

## Manual regression workflow

Use separate controlled disposable accounts, never the owner's real Library/password for destructive checks. Keep credentials in ignored local settings, not documentation. Account deletion and password changes need an explicitly disposable workflow and appropriate confirmation.

Run the [production smoke test](DEPLOYMENT.md#production-smoke-test) on the actual intended origin, including signup/reset delivery to a non-team inbox, two-reader privacy, duplicate CSV import, reading/Undo, automatic permitted DNA updates and personalisation-off behaviour. Test actual phone/browser keyboard, portrait/landscape, desktop sidebar, focus, reduced motion, dark/high-contrast and larger text. Pixel/viewport checks alone do not establish accessibility or usability.

For live database boundaries, inspect deployed migration history/policies and follow [the manual RLS SQL](../supabase/tests/rls_boundary_manual.sql) with two temporary Auth identities. Read its transaction/rollback instructions first. Do not treat a passing local suite as proof of hosted parity.

For recommendations, document specific-book, genre/mood, exclusions, sparse-DNA and personalisation-off cases. Verify actual catalogue title/author/cover, cite supported facts and record mismatches as bugs. Helpful/rejection should persist without silently changing DNA; explicit corrections must change only the intended permitted signal. Generated labels are not an accuracy metric.

## Recording results

Add a dated entry to [BUG_AND_TEST_LOG.md](BUG_AND_TEST_LOG.md), with revision, environment/origin, reproducible steps, expected/actual result, relevant sanitized evidence and any remaining bug. Recheck only affected areas after a change plus the required release commands. Keep historical counts labelled by date instead of rewriting old reports as current.

Never include passwords, real API keys, session cookies, auth callback tokens or private notes in fixtures intended for version control or screenshots. The public CSV template and synthetic local SQL/test records are intentional test/support assets, not production mock data.
