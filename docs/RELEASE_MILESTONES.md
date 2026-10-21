# Vela MVP milestones — 21 October 2026

These annotated Git tags mark repository snapshots. They do not deploy the app, publish an npm package, enable paid APIs or certify that hosted configuration matches the repository.

| Tag | Revision | Scope and evidence |
| --- | --- | --- |
| `v0.8-feature-complete` | `fe16271` | Core entry/setup, Library, reading/reflection, recommendations/DNA and Settings/CSV flows. The subsequent [authentication and testing log](BUG_AND_TEST_LOG.md) records the milestone checks and outstanding services. Historical snapshot; not re-tested with today's dependencies. |
| `v0.9-validated-beta` | `8ad1f5f` | Responsive layouts, theme/recovery fixes and CSV cover recovery. The [20 October cover evidence](evidence/csv-cover-verification-2026-10-20.json) records 68 passing tests, lint/build and isolated hosted import checks. Historical snapshot; not a claim of public production readiness. |
| `v1.0-mvp` | Final cleanup commit containing this document | Updated prototype flow, dead-code/dependency cleanup, documented environment settings and reusable semantic controls. Package and lockfile version: `1.0.0`. Final verification results are recorded below. |

## Cleanup boundaries

- Removed the unreferenced legacy `BookDiscovery` screen, duplicate `BottomNav` component/styles and unused formatter module after checking imports and references.
- Removed unused `react-hook-form` and `@hookform/resolvers` dependencies. Current forms use native semantic inputs, labels, fieldsets and the existing shared controls.
- Kept reusable design-system components and their exports, shared progress/finish/DNF editors, BookCover, navigation, sheets/dialogs and CSS tokens. Unused reusable exports are not mock data.
- No sample reader/book records or development-preview routes remain in application source. Test fixtures, dated verification evidence and the user-facing CSV template remain intentionally separate from runtime data. Missing-cover placeholders and honest loading/empty/error states remain functional UI.
- `.temp` is ignored by Git and lint; it contains local verification artifacts, not application routes. No production route imports it.
- `.env.example` and the README list all eight application environment variables, their visibility and defaults. Real keys and disposable-account credentials remain ignored. SMTP and authentication callback configuration belong to Supabase.

## Final verification

The release tag is created only after tests, lint and production build pass on the cleanup tree. The tag points to a commit containing the cleanup; Git cannot include uncommitted changes in a tag. See the final entry in [the testing log](BUG_AND_TEST_LOG.md) for the recorded results.

Final cleanup checks passed on 21 October: **71 tests, 0 failures**, including 122 baseline RLS assertions and 142 full-schema privacy/reset/deletion assertions; lint passed; production build generated all 36 pages. Dependency resolution passed, package/lockfile versions and dependency maps match, all eight application environment variables are documented, and application source has no temporary-preview imports. The test runner still reports its existing non-failing Node module-type auto-detection warnings. [Machine-readable evidence](evidence/release-cleanup-2026-10-21.json).

## Known acceptance limits

- Custom SMTP and signup/reset delivery to an arbitrary controlled non-team inbox on the production origin remain a deployment acceptance item. Earlier controlled inbox checks are not public delivery verification.
- Google Books and Gemini can be unavailable or quota-limited. Existing Library/manual tracking has recovery paths; recommendation relevance and generated fit labels are not objective accuracy scores.
- Gemini remains gated by an independently verified Free Tier/no-paid-billing attestation and an emergency switch. The app cannot inspect billing or enforce an account-wide monetary cap.
- Reminders use supported browser permission and in-app scheduling; they do not promise background delivery while the app/browser is closed.
- Local PostgreSQL isolation, reset and deletion tests do not replace a fresh audit of hosted policies. Responsive browser checks do not establish physical-device coverage or a complete accessibility certification.

Tags are local repository references unless explicitly pushed. Existing tags are never force-moved. Later fixes should receive a new commit and a new release tag so these milestones remain reproducible.
