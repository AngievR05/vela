# Supabase setup and verification

Apply `migrations/202609220001_initial_schema_rls.sql` to the Supabase project before using accounts. The Auth trigger creates each reader's profile (default name: Reader) and AI settings. Personalisation choices are not required during sign-up.

## Authentication configuration

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. The application uses the public key with the signed-in reader's session; no service-role key is used.

In Supabase Authentication URL Configuration:

- Set Site URL to the application's public origin.
- Allow `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback` for local development.
- Add the deployed application's `/auth/callback` URL for production. Query parameters carry the safe return route or `/reset-password`.
- Enable email confirmations and require passwords of at least 8 characters. Local `config.toml` includes these settings; hosted projects must be configured separately.
- Configure SMTP for reliable production delivery.

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

## End-to-end acceptance

With Supabase configured, verify account creation and confirmation, login, incorrect credentials with retained inputs, a page reload and a refreshed session, logout, password reset email and password change, expired links, and login's return to a requested private page. Check that a second browser session cannot read the first reader's data.
