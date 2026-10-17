# Free-tier degradation, security and privacy audit — 17 October 2026

## Result and scope

57 regression tests passed, lint and the production build passed on Next.js 16.4.2. The existing baseline suite reports 122 PostgreSQL RLS assertions; the added all-migration audit reports **142 additional assertions** across every private table, reset and deletion. Production dependencies have zero reported npm advisories after updates. Five high-severity development-tool dependency findings remain, described below.

Provider failures were simulated; **no live Gemini or Google Books request was made by the fault-test server**. Actual Vela production routes used the hosted disposable reader for Library/API checks. Destructive reset/deletion checks ran only in local PostgreSQL fixtures with two synthetic readers. The personal reader's account, Library and password were not used. No hosted account was deleted and no hosted DNA reset was performed.

Evidence: [provider/API checks](evidence/provider-degradation-2026-10-17.json), [security summary and secret scan](evidence/security-audit-2026-10-17.json). The earlier [hosted recommendation evaluation](recommendation-evaluation-2026-10-17.md) remains separate evidence of real provider results and hosted DNA/feedback behaviour.

## Provider failures and Library independence

| Condition | Verification |
| --- | --- |
| Google Books 503 / unavailable | Search returns an honest error with retry and manual-add recovery. No fabricated catalogue results. |
| Gemini 503 / unavailable | Bounded retries; recommendations return an honest 503 with retained-request/retry and Library recovery guidance. No invented fallback recommendations. |
| 402 / payment unavailable and 403 / denied | One Gemini attempt, no model fallback, no billing upgrade, credit purchase or paid-service substitution. API recovery remains available. |
| 429 / quota reached | One Gemini attempt, then a process-local 60-second cooldown shared across requests; Google Books has its own cooldown. Repeated HTTP requests made no new outbound provider attempts during that window. |
| Cooldown recovery | Deterministic tests advance the clock and verify requests can succeed afterward. No real quota was exhausted. |
| Missing provider keys | Provider operations fail cleanly before sending; missing keys no longer make the shared server environment parser fail. Library data operations remain independent of AI configuration. |
| Core reading while both providers fail | Hosted Home, Library data, Stats, DNA, Settings, export and saved recommendations remained available. Manual book creation, progress and finish/rating saved successfully. The audit book was soft-removed and the original disposable Library snapshot matched exactly afterward. |

Quota guards are process-local, not a distributed usage meter or account spending cap. They cannot retract concurrent requests already in flight. Google/Supabase availability remains necessary for their respective features; an AI outage is distinct from a database outage. Saved-state recovery/error actions are verified through APIs and existing components; this is not a new physical-device UI audit.

## No silent paid usage

The owner explicitly confirmed on 17 October that the Gemini key's project is **Free Tier with no paid billing linked**. Recorded this confirmation in ignored local configuration. New deployments default closed: `GEMINI_FREE_TIER_VERIFIED` must explicitly be `true`; `GEMINI_ENABLED=false` pauses generation without changing Library tracking. Only the two reviewed Flash Lite model identifiers are accepted by the application's generation entry point. Client requests cannot supply a model/key/provider or override this policy. Quota does not trigger switching to a paid API, upgrading billing or purchasing credits.

This flag records an owner/deployment attestation; it cannot inspect or enforce Google's account billing state. Recheck it when changing the key, project or cloud billing. Do not enable it for a paid project. Google ties tier changes to billing configuration, so a model name or application retry limit alone cannot guarantee free usage. [Official Gemini billing guidance](https://ai.google.dev/gemini-api/docs/billing). No cloud billing settings or paid quotas were changed during this work.

## Reader isolation, reset and deletion

All checked-in migrations were applied in filename order to PGlite's actual PostgreSQL engine, with only Supabase's `auth.users`/JWT functions and roles represented by fixtures. Policies, grants, foreign keys, triggers and application functions came from the real migration files.

- RLS enabled on all 11 public tables: ten private tables plus the intentionally shared catalogue. Both synthetic readers could see only their own private rows; cross-reader reads, updates, deletes and ownership reassignment were denied across profiles, settings, Library, signals, recommendation sessions/results/feedback, reading stats, DNA changes and progress history.
- Anonymous database reads were denied on every table. Manual metadata stayed private; authenticated readers could still see shared catalogue facts.
- DNA reset preserved the complete Library rows and saved privacy settings. Existing tests also verify setup preferences, Reset cutoffs, corrections and old evidence are handled correctly.
- Deletion without recent password verification, stale verification and incorrect confirmation was rejected. Fresh, explicit deletion removed only the intended reader's Auth/profile data, all ten private-table records and private manual metadata; the second reader's records matched exactly and shared catalogue facts remained.
- On the hosted disposable account, five private API reads rejected anonymous requests. Unknown Library IDs could not be read or mutated. Deletion rejected missing verification and a caller-supplied target reader ID.

**Limit:** two-reader mutation/deletion isolation was tested against the full local migrated schema, not with two newly provisioned hosted accounts. This is not a fresh export/comparison of every deployed Supabase policy, a penetration-test certification or a guarantee about provider backup retention. No new SQL migration is required for the fixes in this audit.

## AI minimisation and consent

Planning receives the current request/filters, bounded approved reading examples, permitted preference labels/weights and explicit controls. Ranking receives at most 30 catalogue candidates, 30 signals and 20 approved activity examples, with truncated public descriptions. Personal email, display name, private notes, private DNF text, passwords and tokens are not model inputs. Book clues use the selected public title/description, not reading history. Source/API schema checks prevent clients from supplying arbitrary reader identity or invented evidence.

Found and fixed **SEC-01**: active learned signals already respected per-book consent, but a reduced/stopped learned row could still enter the model's controls after that consent was withdrawn. Controls now require current permitted book evidence too. Regression checks verify DNF controls disappear after per-book denial, account-level DNF denial or the Reset cutoff. Ordinary Helpful/rejection remains distinct from learning consent.

DNF learning requires personalisation, the account DNF permission, per-book permission and current approved reasons/evidence. “Not in the mood” is not learned as a stable dislike. Personalisation off excludes signals, approved activity and controls. Existing and new tests use private-note canaries to verify those fields stay out of AI inputs.

## Secrets and dependencies

The final production client build and tracked/source/document files were scanned for the actual configured Gemini key, Google Books key and disposable test password, without printing their values. No matches were found. Provider adapters remain behind `server-only` entry points; only the Supabase URL/publishable key are public. Removed raw Google Books error logging, since request errors can include keyed URLs. Authenticated responses are private/no-store through Proxy, and mutations recheck identity at the API/data boundary. This scan does not examine historical commits, previously published logs or third-party bundles outside Vela's build.

Updated Next.js and its matching lint configuration **16.3.5 → 16.4.2**, sharp **→ 0.35.5**, and source-map-js **→ 1.2.2**. The original production audit reported one critical and two high package findings; the final production-only audit reports **zero**. Finding an affected dependency does not establish that Vela's routes exposed every advisory's exploit prerequisites. [Next.js advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j), [sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w).

**SEC-02 remains open:** npm's full dependency scan reports five high findings along the development-only chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. The offered forced fix would downgrade lint configuration to a mismatched major version. It was not applied. Keep lint inputs trusted and revisit when a compatible upstream fix is published; do not describe the entire dependency tree as vulnerability-free.

## Repeat checks

```text
npm test
npm run lint
npm run build
node scripts/audit-client-secrets.mjs
npm audit --omit=dev
npm audit
```

The full npm audit currently exits nonzero for SEC-02. Browser notifications, SMTP setup, strict recommendation exclusions and the intended production-domain smoke check remain the separately recorded release items; these results do not move their planning dates or invent new official deadlines.
