# Quota, security and privacy verification — 18 October 2026

Repeated the [17 October audit and fixes](security-quota-audit-2026-10-17.md) against the saved code and patched dependencies. The original findings, implementation details and audit boundaries remain documented there.

| Check | Result |
| --- | --- |
| Regression suite | **57 passed, 0 failed**. Includes 122 baseline PostgreSQL RLS assertions and 142 full-schema isolation/reset/deletion assertions. |
| Production API fault checks | **24 passed** using the hosted disposable reader and simulated Google Books/Gemini responses. No live provider calls. |
| Failures tested | 402 payment unavailable, 403 denied, 429 quota and 503 service unavailable. Bounded retries and a quota cooldown; no paid-service/model switch. |
| Core reading | Home/Library, stats, DNA, settings, export and saved recommendations stayed available. Manual add, progress and finish/rating saved while providers failed. The original disposable Library matched afterward; only the new audit book was soft-removed. |
| API protection | Anonymous private reads denied; unknown Library IDs unreadable/unmodifiable; deletion rejected missing verification and caller-supplied target reader IDs. |
| Database isolation | All ten private tables tested in both directions with two local readers, including cross-reader reads, updates/deletes and ownership reassignment. Anonymous reads denied. Manual metadata private; shared catalogue facts remain shared. |
| Reset/deletion | Local reset preserved complete Library records and permissions. Fresh verified deletion removed only the intended reader's data; another reader's rows and shared facts survived unchanged. No hosted reset or account deletion. |
| AI privacy | Private-note canaries excluded; independent personalisation/rating/history/DNF permissions, per-book consent and Reset cutoffs honoured. The consent-withdrawal fix also excludes learned Stop/Reduce controls without current permitted evidence. |
| Secrets | Actual configured private provider keys and test password absent from the client build and scanned repository/source/document files. Values were not printed. |
| Production dependency audit | **0 reported vulnerabilities**, using Next.js 16.4.2, sharp 0.35.5 and source-map-js 1.2.2. |
| Development dependency audit | **5 high findings remain** in the lint-tool chain rooted in `braces`; no compatible automatic fix. Kept separate from production risk; did not force an incompatible lint downgrade. |

Lint and production build verification are recorded in the accompanying evidence. All verification uses the checked-in migrations and real application operations; provider responses alone were simulated.

The owner confirmed Gemini Free Tier with no paid billing linked on 17 October. Local configuration records that confirmation. New deployments require explicit `GEMINI_FREE_TIER_VERIFIED=true`; otherwise AI stays paused, and `GEMINI_ENABLED=false` remains available as a stop switch. Model selection is restricted and quota errors never trigger paid upgrades. This is an owner attestation, not an independent cloud-billing check: changing the key/project/billing requires re-verification. The app cannot guarantee Google's account state through an API key alone. [Google's billing documentation](https://ai.google.dev/gemini-api/docs/billing).

Remaining boundaries: quota cooldowns are process-local rather than distributed account limits; two-reader destructive/RLS testing used local PostgreSQL rather than a fresh hosted policy export; this is not a historical Git/log secret scan or a physical-device UI audit. Supabase must still be reachable for online Library saves. Existing SMTP, recommendation-exclusion and production-domain release items remain open under their own acceptance criteria.

Evidence: [provider/API results](evidence/provider-degradation-2026-10-18.json), [security and dependency summary](evidence/security-audit-2026-10-18.json).

Repeat with `npm test`, `npm run lint`, `npm run build`, `node scripts/audit-client-secrets.mjs`, `npm audit --omit=dev` and `npm audit`. The full dependency audit currently exits nonzero for the development-tool findings.
