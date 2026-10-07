# Supabase setup and verification

Apply `migrations/202609220001_initial_schema_rls.sql` to the Supabase project before using accounts. The Auth trigger creates each reader's profile (default name: Reader) and AI settings. Personalisation choices are not required during sign-up.

Apply `migrations/202610060001_reading_setup.sql` next. It adds saved setup choices and completion time to profiles, changes new-reader AI defaults to off, and adds `save_reading_setup`. This function runs with the reader’s permissions, derives ownership from `auth.uid()`, validates the same allowed choices as the frontend, and saves preferences, data permissions and onboarding DNA signals atomically. It deactivates removed onboarding signals while preserving learned/manual evidence and existing references. Existing readers’ AI settings are not silently overwritten.

The protected `/setup` flow implements Figma section **B · Reading Setup and Permissions**. New signup callbacks default to it; explicit protected return destinations still take precedence. DNA and Settings link back to editable setup. Each taste step can be skipped. Optional ratings, DNF and history switches start off for new readers; existing saved settings are reflected accurately. Review creates the starting profile without enabling any unselected optional signal; “Set up later” explicitly turns personalisation and all optional signals off. Library access is independent of these settings.

Unsubmitted choices are retained in reader-scoped session storage when available, with an in-memory fallback. They survive a reload in that tab, are validated before restoration, and are removed after a successful save. Failed saves retain the complete payload for retry. No credentials are stored in the setup draft.

On 2026-10-06, the user confirmed applying the reading setup migration successfully. Live public-key checks confirmed the RPC exists and denies anonymous execution, and that the new profile fields deny anonymous reads. The new PostgreSQL tests verify defaults, direct-RPC validation, atomic rollback, repeat saves, opt-out, preserved learned signals and two-reader isolation. Local isolated browser tests covered all 14 reference states, editing/back navigation, keyboard switches, skipped choices, reload recovery, failed-save retry, small/mobile/desktop layouts, asset loading and real unauthenticated route/API denial. Browser save responses were simulated; authenticated hosted save/reload was not tested through a signed-in Vela session.

## Library and Book Detail

Apply `migrations/202610060002_library_detail.sql` after the setup migration. The user confirmed it succeeded on 2026-10-06. It adds favourites, private notes, exact page progress and removal with Undo. Manual book metadata belongs to its creator; other readers cannot read it or reference it from their Library. Shared Google Books metadata remains available to authenticated readers. The `add_manual_book` function runs with the reader's permissions and uses an entry UUID to make retries safe.

Sections D, E and F use the existing Vela styling and read-only Figma references. `/library` includes Reading, TBR, DNF and Finished shelves, search, filters, sorting and grid view. Covers open reader-protected detail pages. Add Book searches Google Books, previews metadata, saves to TBR or Reading, and handles duplicate books without resetting progress. Manual entries use a matching Google Books cover when available, with an honest placeholder otherwise.

Book Detail saves progress, ratings, favourites, private notes, DNF reasons and the separate learning choice. Removed books leave Home and Library but retain their information for Undo; removal is not permanent deletion. Offline start/progress updates use the existing reader-scoped queue and sync on reconnection. Recoverable search/save failures retain the query, selection or form input.

The PostgreSQL tests execute all three migrations and verify reader isolation, manual metadata privacy, duplicate retries, page bounds, DNF restore, notes and Undo. Isolated browser checks cover the new flows, error retention, offline syncing and responsive layouts with a real Google Books cover; their save responses are simulated. Authenticated hosted write/reload remains a manual acceptance check.

## Discover and Recommendations

Apply `migrations/202610060003_recommendations.sql` after the Library migration. The user confirmed success on 2026-10-06. It adds reader-protected atomic recommendation saves and feedback operations. Both functions run with the signed-in reader’s permissions, validate ownership and consent, and deny anonymous execution.

The app derives candidates and permitted signals on the server. Recommendation output must contain three distinct supplied books and only permitted signal IDs. Ordinary feedback leaves DNA unchanged; future-pattern feedback supports Undo. Explicit signal corrections preserve evidence and consent, and retries do not repeatedly reduce importance. Local PostgreSQL tests execute all four migrations and verify rollback, idempotency and cross-reader denial. Live generation, persisted sessions and Helpful feedback were verified against the hosted project. Preference changes and recovery states were checked with temporary browser fixtures.

## Authentication configuration

### Settings and CSV imports

Apply `migrations/202610060004_settings_import.sql` next; the user confirmed success on 2026-10-06. `save_reader_settings` and `import_library_row` execute with reader permissions and derive ownership from `auth.uid()`. Imports preserve duplicate Library records and private manual metadata. Recommendation inserts also check visibility of the referenced book.

`delete_reader_account` is the single privileged operation: it accepts no target reader ID, requires explicit confirmation and a password-authenticated JWT less than five minutes old, and deletes only that JWT’s reader. The app verifies the password through an isolated Auth client, checks that it belongs to the signed-in reader and keeps the resulting short-lived token in an HTTP-only, SameSite Strict cookie. No service-role key is required or exposed. Local PostgreSQL tests verify stale/anonymous denial, private-data cleanup and preservation of the other reader and shared catalogue metadata.

Hosted Settings reads, profile saves, duplicate CSV import and account export passed after deployment. Anonymous requests were denied for all three new functions and the protected settings/account/import/export APIs. Live deletion and email-address changes were not performed on the user’s account.

Optional cross-browser email-change templates can link to `/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings`. The default flow uses the cookie-backed PKCE client and `/auth/callback?next=/settings`. Email changes remain pending until Supabase’s confirmation requirements are satisfied.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. The application uses the public key with the signed-in reader's session; no service-role key is used.

In Supabase Authentication URL Configuration:

- Set Site URL to the application's public origin.
- Allow `http://localhost:3000/auth/callback**` and `http://127.0.0.1:3000/auth/callback**` for local development. These patterns cover the callback's return-route query parameters. The hosted project also allows the same callback paths on port 3104 for verification.
- The hosted project also allows `http://192.168.3.7:3000/auth/callback**` for this computer’s LAN preview (added October 7, 2026). Request and open confirmation/recovery links using the same network address and browser, since the PKCE verifier and session belong to that origin. Update this exact host if the computer’s LAN IP changes.
- Add the deployed application's `/auth/callback` URL for production. Query parameters carry the safe return route or `/reset-password`.
- Enable email confirmations and require passwords of at least 8 characters. Local `config.toml` includes these settings; hosted projects must be configured separately.
- Configure custom SMTP before opening sign-up to readers. Supabase's default mail service sends only to project-team addresses and is intended for development. Custom SMTP was still disabled during the 2026-10-05 verification; confirmation and recovery email delivery to other readers therefore remains a setup requirement. See [Supabase SMTP configuration](https://supabase.com/docs/guides/auth/auth-smtp).

Default Supabase email links use the PKCE callback at `/auth/callback`. Open these links in the browser where the email was requested. For links that work across browsers, use token-hash email templates:

Signup confirmation URL:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm email</a>
```

Password recovery URL:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Both callback routes verify tokens before creating a session and remove token parameters from the destination URL. Expired links offer a path to request a new link.

Temporary Auth outages return 503 with a retry instruction rather than treating a valid session or email link as expired. Password-reset verification retains input on connection failures; successful changes show a confirmation before continuing. Private pages recheck the session when restored through browser Back as well as when a tab becomes visible.

## Session and route protection

The browser client stores sessions in cookies and refreshes them automatically. `src/proxy.js` refreshes/validates sessions with Supabase Auth and propagates updated cookies. Home, Library, Discover, DNA and Settings (including descendants) require a verified user. API requests without a verified user return 401. API handlers and the app layout also verify users through `src/lib/auth/server.js`; use its reader-scoped client for future data access. Auth responses are marked private/no-store. Logout clears this browser's session and discards cached app pages; other devices remain signed in. This follows the [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

Controlled forms preserve email/password after validation, provider and network failures. Successful sign-up clears the password when awaiting confirmation. Password recovery returns a generic email-sent message. Only email and password are required for account creation.

## Row Level Security checks

Run `npm test`. The RLS suite executes the actual schema migration in an in-memory PostgreSQL instance using PGlite. It emulates Supabase's `auth.users`, `auth.uid()` and roles; it omits the unused pgcrypto extension because UUID generation is built into PostgreSQL. Policies, grants, triggers and composite foreign keys execute unchanged.

Checks cover both readers' access to every private table, hidden cross-reader rows, blocked updates/deletes/inserts, ownership reassignment, foreign-reader recommendation sessions/feedback/signals, and anonymous denial. Shared `books` metadata is intentionally readable by authenticated readers.

This verifies the checked-in migration, not the hosted project's deployed configuration. To verify the live database, run `tests/rls_boundary_manual.sql` in Supabase SQL Editor after replacing its two UUIDs with temporary Auth users from that project. All test rows must pass. Its fixture changes run inside a transaction and roll back.

On 2026-10-05, the restored hosted project passed its 17 boundary checks and the overall `ALL TESTS PASSED` assertion. Two temporary Auth fixtures were created inside the same rolled-back transaction. A read-only audit confirmed RLS on all eight tables, owner restrictions on all seven private tables, authenticated read grants, and no anonymous read grants. Live anonymous API requests were denied for every table. This verification does not test delivery to a reader's email inbox.

## End-to-end acceptance

Reading Stats adds `202610070001_reading_stats.sql`, applied to the hosted project on 2026-10-07. `reader_book_stats` is reader-private through RLS and has no anonymous grants. `save_reading_record` is security invoker, derives the reader from `auth.uid()`, locks the reader's finished book, checks its modification timestamp and saves facts/finish date atomically. Existing library contents are preserved. PostgreSQL tests verify foreign and anonymous denial, stale writes and rollback; hosted anonymous table/RPC/API calls were denied, and an unchanged-value reading record was saved through the UI. Optional missing format/mood/pace information remains explicitly unrecorded.

With Supabase configured, verify account creation and confirmation, login, incorrect credentials with retained inputs, a page reload and a refreshed session, logout, password reset email and password change, expired links, and login's return to a requested private page. Check that a second browser session cannot read the first reader's data.

## Reading DNA controls

`migrations/202610070002_reading_dna.sql` was applied to the hosted project on 2026-10-07 after explicit user approval. It adds `reading_dna_changes` with owner-only RLS and no anonymous grants, influence state and a reset timestamp. `change_reading_dna` and `reset_reading_dna` are security invoker, derive ownership from `auth.uid()` and serialize reader changes. Idempotent requests avoid repeated reductions; Undo rejects newer edits instead of overwriting them.

Reset now preserves explicit setup preferences and privacy permissions as well as the Library, ratings, notes and progress. Both Settings and Reading DNA use this behavior. Historical learned signals are cleared and the cutoff blocks rebuilding from old activity. The migration defines reset; applying it does not execute a reader reset.

PostgreSQL tests exercise anonymous/cross-reader denial, spoofed change ownership, idempotency, concurrent edits, Undo and reset preservation. Hosted Reduce/Undo were verified and restored the original preference. Protected API requests deny unsigned readers. No live reader reset or account deletion was performed.
