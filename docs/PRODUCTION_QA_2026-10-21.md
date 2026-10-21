# Production verification — 21 October 2026

[Live Vela](https://vela-sepia-nine.vercel.app) · [Detailed evidence](evidence/production-qa-summary-2026-10-21.json)

**78 automated tests, lint and production build passed.** The expanded hosted review used the existing controlled disposable reader. The owner's Library and password were untouched. Temporary books were hidden, settings/permissions restored and test sessions signed out.

## Fixed and deployed

**QA-PROD-001: outdated reading changes could wait past the browser timeout.** The server now rejects an already-obsolete version before opening a write transaction. A recorded operation still goes through the RPC's identity/payload checks, so retrying a saved update neither duplicates it nor rolls back newer progress. SQL retains its atomic race and Undo checks. Three regression tests and the [final hosted validation](evidence/production-final-validation-2026-10-21.json) passed after deployment. No migration was needed.

## Hosted checks

| Area | Result |
| --- | --- |
| Entry/exit and recovery states | 36 public viewport/error checks at 320, 390, 768 and 1440px; simulated Auth 429s retained input; invalid reset links offered recovery. |
| Sessions and privacy | Login, reload and logout passed. Direct reads across all ten private tables returned only the current reader; known foreign detail was denied. |
| Library | Manual saves, safe retries, favourites/private notes and remove/restore passed. |
| Reading | Page validation, simulated-503 input retention, offline single-sync, 100% remaining Reading, finish/rating/dates, Undo, DNF consent and restore passed. |
| Stats | Format, genre, mood and pace saved and read back. |
| DNA | Approved finish evidence appeared automatically; Reduce/Undo passed. Denied DNF learning stayed excluded. |
| Discover | A live request returned three distinct catalogue identities. Helpful/rejection and Show less/Undo saved; ordinary feedback did not alter the displayed DNA state. Personalisation-off excluded active signals and saved matched evidence. |
| CSV/covers | Real upload, duplicate preservation and a real ISBN import resolving an image passed. |
| Settings/accessibility | Dark mode persisted after reload; seven private/setup pages fit 320px with large text/high contrast. Private export included only the current reader. |
| Production reset email | Request returned 200 and targeted the production callback. Owner confirmed inbox receipt. Password was not changed. |

Initial failures and selector corrections remain in the raw evidence; the summary distinguishes them from the final successful recheck.

## Remaining acceptance limits

- New-account confirmation and a complete password-change cycle on a controlled non-project-team inbox are not established. The supplied email already belonged to the owner's account; controlled reset receipt does not prove unrestricted public delivery.
- Account deletion and irreversible DNA reset passed local PostgreSQL tests; neither was executed against an existing hosted reader. Hosted read isolation does not replace destructive two-reader write/delete testing in a dedicated staging project.
- Checks use headless Edge and simulated failures where appropriate. They do not certify every physical device, all accessibility needs, permanent provider availability or objective recommendation accuracy.
- Background/closed-app notifications and public email service setup retain their documented limits. Test-created soft-removed history and a recommendation session remain only in the disposable account.
