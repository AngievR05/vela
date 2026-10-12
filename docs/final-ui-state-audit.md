# Final UI state review — 12 October 2026

Reference: Figma `KUdyt409wRaPTCSRdfeEH5`, page `1:8`, **➔ A. Final UI (PNGs)**. The review reads design frames and prototype reactions; it does not modify the Figma file. Presentation keyboards, status bars and home indicators are excluded from the web implementation.

## Section coverage

| Section | Application handling |
| --- | --- |
| A — Entry and Authentication | Splash/session check, returning reader, unavailable/offline recovery; signup/login validation, loading and service errors; confirmation, recovery resend, reset-link errors and success; Terms and Privacy. |
| B — Reading Setup and Permissions | Optional setup steps, multi-select choices, explicit source permissions, editable review, reader-scoped persistent drafts, skip confirmation, save/retry and completion. |
| C — Home | Current reading, no current book, insufficient activity, skeleton, cached offline view and retry. Progress uses the shared editor. |
| D — Library | All four shelves, shelf/grid views, per-tab emptiness, title/author search, filter/sort sheets, no filter matches, loading/offline/error recovery. |
| E — Add Book | Search/loading/results/no results, manual validation and retained entries on save failure, preview, duplicate protection, TBR/Reading success and guarded Undo. |
| F — Book Detail | TBR/Reading/Finished/DNF details, description and supported book attributes, progress, private notes, more actions, remove confirmation and Undo. Saved reflection editing is reachable here. |
| G — Current Reading and Progress | Page/percentage inputs, unknown page count, validation, notes, saving, no-change, last-page state, offline queue, retained retry, Undo and dirty-form dismissal confirmation. |
| H — Finish Book | One optional rating/reflection sheet, dates and private notes in More details, per-book consent with global permissions applied, save/error/offline handling, Undo; independent saved-reflection editor. |
| I — DNF and Graveyard | Optional structured reasons, private other reason, temporary-mood exclusion, per-book consent, saved progress, empty Graveyard, restoration/retry and Undo. |
| J — Discover | Request/filter entry, loading, more context, no close match, provider failure/offline, retained draft and retry. |
| K — Recommendations and Correction | Three verified works, detail, confidence labels, collapsed/expanded explanations, current permitted evidence, TBR save/Undo, helpful/not-for-me including Other, explicit correction and feedback retry. |
| M — Reading DNA | New/forming/strong/emerging/unused, evidence, Keep/Reduce/Stop, explicit Undo, management/explanation, reset and completion, disabled/offline/loading/failure states. |
| N — Settings and Account | Preference and permission controls, theme/accessibility, notifications, stored-data summary, cancellable export preparation, explicit download/retry, profile/password, guarded logout and verified deletion; CSV import retained. |
| O — Global States | Existing domain loading, empty, offline, error/retry, saved/Undo and destructive-confirmation patterns are reused; these are states rather than duplicate routes. |
| P — Reading Stats | Overview, period selector, time, genres/moods, pace/length, ratings, source-book drilldowns and editable records, empty period/loading/offline/retry. |
| Q — Checklist Additions | Native focus/validation states; retained errors; source-permission notices; dirty progress confirmation; saved rating/reflection editing; filtering/sorting; larger text/narrow screens; setup draft persistence. |

## New gaps completed

- **G22 (`533:10193`)**: Cancel, Close, Escape and backdrop dismissal of edited progress ask before discarding. Keep editing retains value and private note; Discard sends no mutation.
- **H16 (`537:10896`)**: Edit saved structured reflection independently of finish/rating/date operations. Only `finish_feedback` and its activity timestamp change. RLS and optimistic concurrency apply; the existing database trigger refreshes approved DNA evidence. Consent and global source permissions are preserved.
- **N18 (`518:7160`)**: Stored reading data uses the signed-in reader's Library count and provides separate permissions, Library, finished ratings/reflections and export entries.
- **N20/N21 (`518:7280`, `518:7313`)**: Export stays private and requires an explicit download. Preparation is cancellable; late responses cannot reopen a cancelled export. Failure supports retry. Object URLs are revoked on cancellation/unmount.
- **E07/E08 (`323:380`, `323:404`)**: Undo newly added TBR/Reading books with the saved record version. Duplicate adds have no destructive Undo. A newer edit rejects Undo rather than discarding new progress.
- Library and Add Book use the current exact Figma logo assets. Library's main shelf layout omits the extra shortcut row; reading/Graveyard shortcuts remain on the relevant tabs.

Some old review annotations reference deleted nodes (for example K16/K17 and an independent notification-schedule screen). They are historical reference material, not instructions to recreate removed screens. Some prototype links still retain old layer names or point to unrelated frames; implemented actions follow the visible control's purpose while preserving the current simplified reading flow.

## Verification

- 49 automated tests pass, including PostgreSQL reader isolation, reflection consent/date preservation, ownership, stale updates, input validation, CSV/privacy and existing authentication/recommendation logic.
- Isolated browser fixtures cover stored counts, export cancellation/failure/retry/download, progress dirty/clean dismissals, finish retry/consent, reflection editing/retry, DNF restoration and all-section narrow-layout smoke checks. Simulated reader records avoid altering a real account.
- Exact local logo dimensions and loaded assets are checked in the browser. New states are compared against the requested Figma renders.
- Live Supabase reads verify the actual Library count and the finished-book reflection entry. Browser tests do not save changes to the real reader's books.
- Lint and the production build pass; the temporary fixture route is removed from the final application.
- Browser reminders require an open app and browser permission. Email confirmation/reset delivery remains subject to the project's SMTP configuration. The app cannot own operating-system notification settings.
