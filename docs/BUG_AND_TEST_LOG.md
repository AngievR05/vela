# Bug and testing log — 13 October 2026

Milestone preparation for 14 October. Application revision checked: `fe16271`. Figma, the existing reader's Library and their password were preserved during these checks.

## Latest verification

**21 October prototype update:** **71 tests passed, 0 failed**, including 122 baseline RLS assertions and 142 full-schema privacy assertions. Implemented the new Explore detail/explanation/saved flow, matched its badge/evidence styling and aligned Back/Cancel destinations. Saved recommendations open their actual shelf. Fixed a stale feedback retry affecting later save errors, duplicate success notices and an offline-disabled saved-Library link. Real saved-result identities/covers and evidence navigation were checked read-only. Ten layout checks passed at 320–1440px; isolated component checks passed for Save/Undo, feedback/Undo, a simulated 503 followed by recovery, Experimental returns and offline controls. Lint and production build passed with no temporary preview route. No owner data was edited; no migration is needed. [Prototype review](prototype-parity-review.md) · [Sanitized evidence](evidence/prototype-update-2026-10-21.json).

**20 October CSV cover repair:** **68 tests passed**, including equivalent ISBN matching, safe cover-response parsing, provider backoff, ISBN-less recovery and PostgreSQL cross-reader cover denial. Missing covers now resolve through a reader-protected endpoint for both new and previously imported books. Google Books supplies the images; verified Open Library title/author matches supply missing ISBNs when needed. Cover requests run as books come into view, coalesce repeated lookups, and retry a temporary failure once after a cooldown. Lookup never replaces the reading record or sends private notes/ratings. Lint and production build passed. Seven hosted disposable-account checks verified CSV import, the Google image redirect/download, signed-out denial, unchanged reading records, duplicate-safe re-import and cleanup. Two previously imported books also displayed loaded 128px cover images in the real Library. No re-import or database migration is required. [Sanitized evidence](evidence/csv-cover-verification-2026-10-20.json).

Some books may have no verified catalogue match or available Google Books image. These retain a placeholder rather than receiving an unrelated cover. The main Google Books catalogue returned 503 during this verification; ISBN cover lookup and the verified ISBN fallback succeeded. Implementation references: [Google Books thumbnail lookup](https://developers.google.com/books/docs/dynamic-links), [Open Library search](https://openlibrary.org/dev/docs/api/search) and [rate limits](https://openlibrary.org/developers/api).

**19 October functional and appearance audit:** **61 tests passed, 0 failed**, including 122 baseline RLS assertions and 142 full-schema privacy/reset/deletion assertions. Lint and production build passed. **22 hosted API checks** passed using the disposable reader: persistent authentication, protected access, manual entry/retry/Undo, progress, finish/rating/dates, DNF/restoration, stale-write protection and CSV duplicate prevention. Original disposable Library records were preserved; new QA entries were soft-removed. The main reader's books were not edited, and appearance preferences were restored after testing. See [sanitized functional evidence](evidence/functional-audit-2026-10-19.json).

Fixed dark-mode cards, inputs, icons, chart/legend colors and text contrast across the main screens; high contrast preserves text on colored cards. Reading setup now loads the saved appearance, preferences sync between tabs, and compact spacing takes effect. Browser checks covered desktop and 390px mobile layouts, larger text/high contrast, saved theme across navigation, cross-tab synchronization, and retained finish/DNF/date edits after attempting dismissal. Representative visible-text contrast checks passed; this is not a complete accessibility certification or physical-device audit.

Also fixed manual add → Undo → re-add returning a still-hidden book, switching back to manual entry retaining an old selected-book preview, offline Undo dropping other books' queued updates, missing activity notifications after Stats edits, and silent dismissal of finish/DNF/date edits. A partial catalogue outage now produces a retryable service error when too few candidates remain, instead of incorrectly reporting no matches.

**Live provider limitation:** Google Books returned intermittent HTTP 503 `backendFailed` responses on exact-parameter retests; Vela search returned a recoverable 502. One live recommendation request returned no-match before the partial-outage fix, so successful live recommendation generation is **not established by this run**. Core Library writes/imports passed during these checks; the simulated quota/outage tests pass. No public SMTP setup or new public email-delivery verification was performed.

**18 October quota/security audit:** 57 regression tests passed, including 122 baseline RLS assertions and 142 full-schema privacy/reset/deletion assertions. Twenty-four production API checks passed with simulated provider failures and the hosted disposable reader; core reading stayed available and its original Library was preserved. Fixed quota retry amplification and learned controls leaking after book-level consent withdrawal; added a default-closed Free Tier deployment gate and patched production dependencies. Client secret scan passed. Five development-only lint-chain findings and fresh hosted two-reader policy verification remain open. See [audit and evidence](security-quota-audit-2026-10-18.md).

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
