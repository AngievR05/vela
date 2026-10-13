# Risks update — 13 October 2026

Prepared for the 14 October milestone and the plan through 28 October. Scope remains frozen; release checks are separate from completed implementation.

## Current evidence

49 automated tests and 122 local PostgreSQL privacy assertions passed; lint and the production build passed on 13 October. Real hosted authentication checks verified signup activation, login, reload persistence, logout and private route/API denial. The owner confirmed confirmation and reset emails arrived. The existing reader's Library and password were preserved. See the [testing log](BUG_AND_TEST_LOG.md) and [sanitized authentication evidence](evidence/auth-verification-2026-10-13.json).

## Remaining risks and limits

| Area / priority | Impact and current safeguards | Remaining action / acceptance evidence |
| --- | --- | --- |
| Public authentication email — high | Custom SMTP is disabled. Delivery to the supplied controlled inboxes passed, but public signup/reset delivery is not established. API acceptance is distinct from inbox receipt. | Owner selects/configures an SMTP provider; verify confirmation/reset at a controlled non-team inbox and on the production origin. Target 18 October, dependent on provider setup. |
| Complete recovery/callback cycle — high | Signup activation passed; the initiating signup browser had closed before confirmation, so same-browser PKCE completion was not verified. Reset delivery passed without changing the personal password. | Use the disposable account for same-browser callback and full new-password/old-password rejection/logout checks. Target 15 October. |
| Notifications — bounded scope limitation | Reminders require an open Vela tab, browser support and granted permission. Browser/OS settings or tab throttling can prevent timely delivery. Denial does not block reading. | Demonstrate supported open-app behaviour and explain the limit. Closed-app push and scheduled email remain outside frozen scope; no delivery guarantee. |
| Google Books/Gemini availability — high | External outages, timeouts, quota or key/model configuration can interrupt search, recommendations and insights. Requests are retained; Gemini retries are bounded; IDs/output/evidence are validated. Existing Library tracking does not require AI generation. | Record provider failure/quota recovery and production key/model configuration. Test by 20 October; do not enable paid usage as a workaround. Provider quota/billing settings must be checked independently of the app's retry code. |
| Recommendation relevance / incomplete metadata — high | Real Google Books IDs/covers ground results, but relevance is provisional and metadata may be absent. Three slots are not filled with invented titles. Unmatched imports/manual books can lack covers/facts. | Benchmark specific-book, genre/mood, exclusion, sparse-DNA and personalisation-off requests; verify consent-aware finish/rating DNA refresh and explicit corrections. Target 18 October. |
| Hosted privacy and production readiness — high | Local migration/RLS tests pass, and live authentication checks pass. They do not prove every deployed policy, callback URL or production path is correct. | Final hosted audit by 20 October, planned deployment 23 October and production smoke checks by 24 October. Test destructive actions only on disposable fixtures/accounts. |
| Offline recovery — bounded scope limitation | Reader-scoped cached views/open-tab queues support partial recovery. Saves still depend on Supabase; stale conflicts remain visible. No service-worker-backed offline launch is provided. | Check offline/reconnect/conflict behaviour in final QA; describe cached views honestly rather than promising full offline operation. |
| Human usability/accessibility evidence — high | Automated/state checks cover many paths but do not substitute for independent participant findings or a complete device/focus/contrast audit. | Human walkthrough by 16 October; visual/accessibility review 17–20 October. Record actual findings and fix critical failures before release. |

Supabase documents its default mail service as restricted and unsuitable for production; current controlled delivery does not remove the SMTP action. [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).

## Milestone update to present

The core reading loop and account flows are implemented. The latest suite has 49 passing tests, with lint/build passing and live signup/login/session/logout checks completed. Both confirmation and reset emails reached the supplied inboxes. Remaining priorities are public SMTP, a full disposable recovery cycle, human usability, recommendation/DNA quality checks and final privacy/accessibility/production verification. Reminders work only with Vela open and browser permission; external catalogue/AI services can be unavailable or quota-limited. Existing Library tracking remains usable when AI is unavailable, provided Supabase is reachable.

## Linked plan

- [Risks update on the Notion board](https://app.notion.com/p/3f8505c6697b81e0b4eafaace9106ee0)
- [Frozen scope](https://app.notion.com/p/3f8505c6697b8154bc6ee1047e5b1dab)
- [Sprint plan through 28 October](https://app.notion.com/p/3f8505c6697b81cd8598d1f1e77c2015)
- [Authentication test-account guide](authentication-test-accounts.md)

The board's existing UX submission deadline remains 25 October at 22:00 Africa/Johannesburg; presentation is listed for 28/29 October. These risk-action targets do not change those deadlines.
