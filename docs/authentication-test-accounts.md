# Authentication test accounts — 13 October 2026

| Account | Purpose / status |
| --- | --- |
| Existing reader supplied privately by the owner | Confirmed account. Live login, reload persistence, logout, access denial and reset-email delivery verified. Library/password preserved. |
| New disposable milestone account using the second controlled inbox | Signup/email delivery and activation verified. Login, session persistence, logout and subsequent private API denial passed. A separate random password was generated. |
| Reader A / Reader B database fixtures | Local PostgreSQL tests verify reader isolation. These are not live email/login accounts. |

The new account's email/password are stored only in the Git-ignored `.env.auth-test.local` at the repository root. Exclude this file from hand-in materials, screenshots, logs and commits. The personal reader's password is not stored there. Existing hosted fixture accounts were not reset or removed.

## Repeatable demo checks

1. Open an isolated browser session and visit `/library`; expect login.
2. Receive/open the signup email and verify activation before claiming signup complete. Open PKCE callbacks in the browser that initiated the flow; another browser may lack its verifier.
3. Sign in, verify the requested route opens and reload to check persistence.
4. Log out through Settings → Account. Revisit Library and verify login is required.
5. Enter an incorrect password once. Confirm the error and retained inputs, then correct it.
6. Request recovery and record API acceptance, delivery and completion separately. Delivery does not prove a password change. Use the disposable account for that full test.

Live verification used local-scope logout in an isolated browser, preserving the owner's original session. Do not delete/reset the personal account or change its Library for a demo.
