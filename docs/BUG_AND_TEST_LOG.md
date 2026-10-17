# Bug and testing log — 13 October 2026

Milestone preparation for 14 October. Application revision checked: `fe16271`. Figma, the existing reader's Library and their password were preserved during these checks.

## Latest verification

**17 October follow-up:** 51 tests (including 122 PostgreSQL privacy assertions), lint and production build passed. A hosted recommendation evaluation ran 15 requests and verified automatic finish/rating DNA, consent denial, ordinary feedback storage, Show less and before/after signal corrections. Fixed generic-genre retrieval and edition/bundle diversity. Strict exclusion/reading-order accuracy and provider timeouts remain open; generation confidence is not an accuracy score. See [evaluation, results and linked bugs](recommendation-evaluation-2026-10-17.md).

| Check | Result and evidence |
| --- | --- |
| Automated suite | **49 passed, 0 failed** on 13 October; includes 122 PostgreSQL privacy/RLS assertions. |
| Lint | Passed on 13 October. |
| Production build | Passed on 13 October; 36 generated pages, temporary fixture routes excluded. |
| Live login | Existing confirmed reader signed in through the frontend and hosted Supabase; returned to the requested Library route. |
| Persistent session | Reload preserved the session; authenticated backend request succeeded. |
| Logout and protected access | Local-scope logout succeeded; private API returned 401 and Library redirected to login afterward. |
| Recoverable login error | Invalid credentials displayed an error and retained both inputs; correct credentials then succeeded. |
| Data preservation | Existing Library snapshots matched before and after testing. |
| Password-reset delivery | Supabase accepted the request (200); the user confirmed inbox receipt. Existing password was not changed. |
| New-account signup | Supabase accepted signup (200); the user confirmed email receipt. Opening the supplied link activated the account, verified by successful password login (200). |
| Confirmation enforcement | New account login was rejected with `email_not_confirmed`, verifying that signup cannot bypass confirmation. |
| Activated test account | Login, session persistence after reload and logout passed. Private API returned 401 after logout. No reading records were added. |
| Email configuration | Email provider and confirmation enabled; custom SMTP disabled, verified in the dashboard on 13 October. |

Live authentication used an isolated Chromium session against the production server at `http://localhost:3000` and the real hosted backend. Prior isolated browser checks covered error/retry, export, progress, finish/reflection, DNF restoration and narrow layouts using simulated records. PostgreSQL tests apply migrations locally and verify anonymous/cross-reader denial, ownership, atomic operations and stale writes; they are not a fresh audit of every hosted policy.

Sanitized live evidence: [authentication verification](evidence/auth-verification-2026-10-13.json). Screen/state coverage: [Final UI state audit](final-ui-state-audit.md).

## Resolved issues

| Issue | Resolution / verification |
| --- | --- |
| Network-address login failed on HTTP | Replaced app UUID calls requiring a secure context and corrected development origin handling. User confirmed network login works. Current live retest used localhost. |
| Authentication errors interrupted account entry | Recoverable errors retain inputs; retry, sessions, protected routes and logout verified. |
| Reading updates had unnecessary steps / inconsistent editors | Shared progress editor, optional finish/DNF reflections, dates, retained retry and Undo; reaching 100% does not silently finish a book. |
| Progress could be dismissed accidentally | Edited progress asks before discarding; keep editing preserves inputs. |
| Saved reflection editing was missing | Independent editor preserves dates and permissions; stale updates and reader privacy tested. |
| Recommendation failures were difficult to recover from | Retained requests, provider errors/retry and Google Books-grounded candidates; personalisation respects permitted evidence. |
| CSV retries could duplicate or overwrite books | Atomic row saves, duplicate protection, retained retry and private manual entries; database/parser checks pass. |
| Export cancellation / add-book Undo could act on stale state | Late export responses cannot reopen cancelled preparation; Undo rejects newer book edits. Browser/database checks pass. |

## Remaining limitations and next checks

- **Custom SMTP is outstanding.** Reset delivery to the existing inbox is confirmed; this does not establish delivery to arbitrary public signup addresses. Configure a provider and verify confirmation/reset with a non-team inbox before public release.
- Confirmation and reset emails reached the supplied inboxes; the second account is activated and its login/logout checks pass. The original signup browser had been closed before opening the link, so a same-browser PKCE callback completion was not verified by this check.
- A live reset-to-new-password cycle was not performed on the existing reader. Use the disposable account for that additional check after activation.
- Browser reminders require Vela to be open and permission granted. Closed-app push/email reminders are not configured.
- Offline support uses reader-scoped cached views and available open-tab queues; it does not provide a full offline installation.
- Recommendations/catalogue search depend on external availability and quotas. Manual/imported books can lack covers or descriptive facts. Fractional CSV ratings round to whole stars with a preview warning.
- Automated/browser checks do not replace an independent human usability test. Record another reader's short walkthrough before the milestone demo.

Repeatable checks: [Authentication test accounts](authentication-test-accounts.md). Credentials are excluded from this log and version control.

## Responsive follow-up — 14 October

Desktop follow-up: screen-owned navigation disappeared in Settings profile and recommendation correction views. Desktop now uses one persistent sidebar in the shared layout. Open dialogs/saves guard navigation and release it afterward. Fixed Library toolbar overlap, Settings nested scrolling and recommendation feedback positioning. **42 targeted desktop checks passed** across 1024–1920px, including retained progress input and repeated discard/close cycles. Fresh **49 tests (122 RLS assertions)**, lint and production build passed. Evidence: [desktop navigation](evidence/desktop-navigation-2026-10-14.json).

Replaced the phone-only desktop width limits with distinct mobile/desktop layouts. Desktop now has branded side navigation, balanced Home cards, compact Library tools, paired shelves/grid and two-column Book Detail; mobile retains bottom navigation and touch-friendly sheets. **157 isolated responsive checks passed**, including dark mode, large text and recovery states. The **49 regression tests**, lint and production build were rerun successfully after the refinement. The temporary preview was removed. Coverage and current production evidence: [responsive verification](responsive-verification.md). Physical-device/cross-browser and full contrast review remain part of final accessibility QA.
