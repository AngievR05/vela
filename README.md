# Vela

**Your reading life, intelligently organised.**

Milestone checks (13 October 2026): **49 passing tests**, lint/build passed, live signup activation/login/session/logout verified and confirmation/reset-email receipt confirmed for the controlled test inboxes. See the [bug and testing log](docs/BUG_AND_TEST_LOG.md), [test-account guide](docs/authentication-test-accounts.md) and [risks update](docs/RISKS_UPDATE.md) for evidence and remaining checks.

Vela is a mobile-first responsive reading companion for self-directed readers. The MVP centres on the loop:

**Track → Reflect → Learn → Recommend → Correct → Read**

The application uses transparent, reader-controlled personalisation. Readers manage their library, build an editable Reading DNA, request three focused book recommendations, inspect why a book was suggested, and correct the signals that influenced the result.

## Stack

- Next.js + React
- JavaScript
- Plain CSS + CSS Modules
- Supabase Free for PostgreSQL, authentication and Row Level Security
- Google Books API for book metadata and candidate search
- Google Gemini API for structured recommendation interpretation
- Zod for validation
- React Hook Form for forms
- Lucide React for interface icons
- Vercel Hobby for deployment
- GitHub for version control and issues

## Start the project

Use Node.js 20.19 or later. Clone/open the repository, then install the dependencies from its checked-in lockfile:

```bash
npm ci
```

Copy the environment template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Add your Supabase public URL/key and server-only Gemini/Google Books keys to `.env.local`. Apply the checked-in migrations in filename order using [Supabase setup and verification](supabase/README.md), and configure allowed callback URLs. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

For another device on the same Wi-Fi, use `http://192.168.3.7:3000` and sign in there separately; sessions and offline caches belong to each browser origin. The development server allows that exact network hostname. If your computer’s IP changes, update `allowedDevOrigins` in `next.config.mjs` and the Supabase callback allowlist. Manual books and recommendation IDs use secure random bytes even on LAN HTTP, and book sharing offers selectable text when native sharing/clipboard is unavailable.

## Verification and production

```bash
npm test
npm run lint
npm run build
npm run start
```

The latest run on 13 October passed **49 tests**, including **122 local PostgreSQL privacy assertions**, lint and the production build. The tests execute the checked-in migrations with PGlite; they do not establish that every hosted policy/configuration is current. Browser checks include isolated state fixtures and real hosted authentication, identified separately in the [testing log](docs/BUG_AND_TEST_LOG.md).

On 14 October, **132 responsive browser checks** passed across 320–1920px, larger text, short-height dialogs, forms and recommendation states. Tablet/desktop layouts now use wider content, paired shelves/cards and larger navigation; mobile keeps the existing styling. See [responsive verification](docs/responsive-verification.md) for coverage and limits.

Production deployment remains a release task. Set the production environment variables and Supabase Site URL/callback allowlist, then verify authentication, private access and core flows on the deployed origin. Keep `main` stable and use short branches/descriptive commits; retain the checked-in lockfile.

## Important security rule

Never commit environment files or test-account credentials. `.env.local` and the private `.env.auth-test.local` are Git-ignored; `.env.example` contains placeholders only.

`GEMINI_API_KEY` is server-only. Do not expose it in a browser component and do not rename it with the `NEXT_PUBLIC_` prefix.

## Implemented features

- Google Books search and canonical metadata lookup power book discovery and saving to the reader's Library.
- Supabase authentication and protected routes are implemented; public email delivery still needs custom SMTP configuration.
- Reading setup, editable taste choices and independent data permissions are saved through a reader-protected Supabase operation.
- Discover creates three validated Gemini recommendations using canonical Google Books metadata and permitted reader evidence when enough eligible works are available; insufficient matches have an explicit recovery state.
- Recommendation sessions, feedback and explicit Reading DNA corrections persist in Supabase.
- The five main product areas are Home, Library, Discover, DNA and Settings, with reading stats reachable from Home.

Library, Add Book and Book Detail follow the completed **D / E / F** designs with shared Figma SVG artwork, shelf ledges, larger real Google Books covers, grid view and responsive scroll areas. All shelves include Reading, TBR, DNF and Finished. Search, filters, sorting, manual entry, duplicate protection, exact-page progress, notes, favourites, removal and Undo use the existing reader-protected backend. Shelf moves retain exact pages; rounded percentage-only progress is labelled approximate.

Book detail includes the full description, genre tags, edition and page length in every shelf state, plus a provisional fit summary based on explicit permitted Reading DNA choices. Readers can request mood, pace and trope clues through the authenticated `/api/library/[id]/insights` endpoint. The server loads only the reader's own book through RLS and sends its public Google Books description to Gemini, without notes, ratings or reading history. Every clue requires a verified description quote and is labelled as an interpretation; unsupported traits stay unknown. Manual entries remain private and are not sent to this provider. Personalisation-off readers still have all book facts. No additional migration is required.
Vela's colour tokens and mobile-first visual foundation are included. Refer to the [Final UI state audit](docs/final-ui-state-audit.md) and [frozen scope in Notion](https://app.notion.com/p/3f8505c6697b8154bc6ee1047e5b1dab) before expanding features.

## Reading Home

`/home` follows Figma’s **C · Home** populated, no-current-book, new-reader, loading, offline and retry states. Greeting, current book, progress, annual finished count, rating average and permitted DNA evidence come from the authenticated reader’s Supabase data. Book search, adding to the Library, starting reading and saving progress use protected APIs. **Saving 100% progress keeps the book Reading** and offers a separate Mark finished action. Library shows saved books; Discover provides recommendations and protected catalogue details.

Home, Current Reading and Book Detail use the shared progress modal with page/percentage validation, optional private notes, retained retry, Undo and confirmation before discarding edits. Finish and DNF each use one sheet with optional rating/reflection or reasons, dates and separate learning consent. Tracking remains available when learning is off. Saved structured reflections can be edited independently without changing finish dates.

While an already-loaded Home is offline, reader-scoped local snapshots and a durable progress queue keep saved books usable. Updates sync after reconnection; conflicts remain visible for retry or explicit removal. Signing out or changing readers clears the old reader’s cached data. This is offline support for an open Home tab, not a service-worker-backed offline app launch.

Apply all migrations listed in [Supabase setup and verification](supabase/README.md). `npm test` exercises Home/reading operations against PostgreSQL, including consent, cross-reader denial, duplicate saves and reading transitions. Live writes, callback configuration and release behaviour need verification on the deployed environment.

## Authentication

Email/password sign-up, login, logout, password recovery, persistent cookie sessions and protected app/API routes are implemented. See [Supabase setup and verification](supabase/README.md) for migrations, email redirect configuration and security checks. Run `npm test` for return-route safety and PostgreSQL RLS tests.

The entry and authentication UI follows Figma’s **A · Entry and Authentication** section. `/` verifies the saved session, `/welcome` presents the entry choices, and the forms display focused, validation, pending, connection-error and success states. The supplied logo and decorative SVGs are local assets; Cormorant Garamond and Geist are bundled under their OFL licenses. Device status bars and home indicators belong to the device rather than the web page.

On 13 October, live checks verified signup activation, login, session persistence after reload, local-scope logout, protected route/API denial and input retention. The owner confirmed confirmation and reset emails reached the supplied inboxes. Custom SMTP remains disabled; arbitrary public delivery is not established. A complete disposable password-change cycle and same-browser PKCE callback remain open checks. The PostgreSQL suite verifies checked-in policies rather than hosted deployment configuration.

## Reading setup

`/setup` follows Figma’s **B · Reading Setup and Permissions** reference states: intro, genres, story elements, pacing, mood, AI explanation, separate data permissions, editable review, completion, skip confirmation and save error/retry. All taste steps are optional. The supplied logo and Figma SVG artwork are local assets. Form choices remain available after recoverable failures, and completed settings reload from Supabase. Settings and Reading DNA reopen the setup for changes or pausing personalisation.

Apply the migrations listed in [Supabase setup and verification](supabase/README.md). `npm test` checks validation, atomic saves, new-reader opt-out defaults and reader isolation using PostgreSQL. The recommendation engine consumes only currently permitted signals.

## Discover and recommendations

`/discover` implements Figma’s **J · Discover** and **K · Recommendations & Correction** states using Vela’s existing styling. Request and filter drafts survive recoverable errors and reloads. Source, genre, mood and length guide candidate selection; unavailable services, insufficient context and fewer than three eligible matches have explicit recovery states. Book covers open protected details with Google Books facts and Library save actions.

Apply `supabase/migrations/202610060003_recommendations.sql` after the earlier migrations. Sessions save three distinct validated recommendations atomically. Helpful and ordinary rejection feedback do not change Reading DNA. Show less records a separate future preference with Undo; Keep, Reduce and Remove change only the explicitly selected, permitted signal. Reader-scoped snapshots support browsing already-loaded results offline and clear on logout.

The server uses `GEMINI_API_KEY` with `gemini-3.5-flash-lite` by default; server-only `GEMINI_MODEL` overrides it. Bounded transient-error retries use `gemini-3.1-flash-lite` by default, configurable with `GEMINI_FALLBACK_MODEL`. These are the code defaults, not a guarantee of provider availability or quota. Google Books supplies canonical candidates, facts and covers. Client-provided candidates, reader IDs and evidence are rejected. Generated book and signal IDs must belong to the server’s allowed lists.

The PostgreSQL tests cover atomic saves, idempotent retry, feedback, correction and anonymous/cross-reader denial. Live hosted generation, session persistence, Google Books covers and Helpful feedback were verified after the migration was applied. Temporary browser fixtures verified preference Undo, explicit corrections and retained input after feedback/save failures; fixtures are removed from the app.

## Home and reading stats

Home and `/stats` follow the completed **C · Home** and **P · Reading Stats** designs, using the supplied SVG logo, exact local Figma background/nav artwork and dynamic Google Books covers. The stats entry points are the Home summary, monthly chart and Stats quick action.

Stats include only visible finished books with valid finish dates up to today. Year/all-time selection, monthly/yearly counts, primary genres, formats, moods, story pace, edition length and whole-star ratings link to the records behind each count. Missing dates, page counts and descriptive facts are explicitly shown rather than inferred. Unrated finished books are excluded from the rating denominator. Current reading and DNF books are excluded from finish totals.

Migration `202610070001_reading_stats.sql` was applied successfully to the hosted project on 2026-10-07, including explicit anonymous grant revocation. It adds reader-private optional book facts and an atomic save operation for facts and finish dates. Editing a reading record preserves input on failed saves; stale records are rejected using the book's modification timestamp. These facts are included in account exports and cascade with account/library deletion. Stats have a separate reader-scoped offline cache, cleared at logout and reader changes. Offline stats are clearly marked as saved data.

Verification: PostgreSQL tests cover real RLS, cross-reader and anonymous denial, atomic rollback, concurrent edits, date filtering and exact page/rating denominators. Live checks verified matching Home/stats totals, chart-to-book navigation, an unchanged-value record save and unsigned API/route denial. The temporary mobile verification route was removed after checking the requested screens.

## Settings, account and CSV import

`/settings` follows **N · Settings & Account** using Vela’s existing styling and local Figma artwork. Profile name, independent AI permissions, theme, spacing, larger text, reduced motion, contrast and optional reminder preferences persist in Supabase. Failed saves retain the chosen values for retry. Logout clears reader caches. Privacy provides a reader-only JSON archive; email changes use password verification and the cookie-backed PKCE confirmation flow. Password recovery reuses the existing secure email flow.

Apply `supabase/migrations/202610060004_settings_import.sql` after the earlier migrations. The user confirmed it succeeded on 2026-10-06. Account deletion requires fresh password authentication, a short-lived HTTP-only verification cookie and typed confirmation. The database operation derives its target from the verified JWT and removes the reader’s account and dependent private data. Shared public Google Books catalogue facts remain. Deletion was tested only in disposable local PostgreSQL fixtures; the real reader’s account was preserved.

Import Library accepts UTF-8 Goodreads/StoryGraph-style CSV files or the downloadable Vela template, up to 2 MB and 2,000 book rows. Title and Author/Authors are required. Supported optional columns include ISBN/ISBN13/ISBN-UID, Exclusive Shelf/Read Status, My Rating/Star Rating, Number of Pages, start/finish dates, Private Notes/My Review and favourites tags. Shelves map to Reading, TBR, DNF or Finished; unknown shelves and invalid rows are reported for correction. Fractional ratings round to whole stars with a preview warning. Non-ISBN StoryGraph UIDs use title/author matching.

The preview precedes import. Small batches save each row atomically; interrupted batches retry safely. Existing books, including removed books, are skipped without overwriting status, notes or progress. Exact ISBN or title/author matches use Google Books metadata and covers; unmatched books become reader-private manual entries. Imported data does not enable any AI permission. Files and their unsaved previews remain in browser memory rather than being stored on a public server.

Notifications run only while Vela is open, the browser supports notifications and permission is granted. Browser/OS restrictions and background-tab throttling can delay or prevent reminders; closed-app push and email scheduling are not configured. Public authentication-email delivery still needs the SMTP setup in [Supabase setup](supabase/README.md). Hosted profile saves, CSV duplicate preservation, export and anonymous denial were verified; isolated browser checks verified appearance, larger text, retained choices and deletion safeguards. `npm test` covers CSV parsing, canonical matching, retry, PKCE email handling, verification identity, RLS and deletion freshness.

## Reading DNA

`/dna` follows the completed **M · Reading DNA** designs with the exact local Figma background and navigation SVGs, Cormorant/Geist typography, responsive cards and fixed actions. The 21 reference states are driven by actual reader data and permissions: new/forming, overview, signal groups and evidence, Keep/Reduce/Stop, durable Undo, reset, personalisation off, loading, offline and recoverable failures. Recorded book evidence opens protected Library details. Chosen preferences are labelled explicitly; no sample books or inferred certainty are invented.

Migration `202610070002_reading_dna.sql` was applied successfully to the hosted project on 2026-10-07 with the user's approval. Changes and reset use reader-scoped security-invoker functions, idempotent operation IDs and concurrency checks. Reset clears inferred signals and corrections while preserving Library records, explicit setup choices and privacy permissions. A reset cutoff excludes old activity from subsequent signals. Settings uses the same reset operation.

Home, Discover and Reading DNA share evidence/permission filtering. Only visible reader-owned books with currently approved activity contribute evidence; unknown mixed provenance is excluded. Strong requires at least three distinct approved evidence items, rather than a weight threshold. Ratings alone do not explain why a reader liked a book. Reduced influence affects recommendation weights; stopped signals are excluded. Personalisation off permits reviewing stored signals without enabling it.

The automatic-reading-activity and reading-flow migrations refresh eligible DNA evidence when books are completed/rated or permitted reflections/reasons change; current permissions and reset cutoffs still apply. This is not unconditional learning from every update.

Verification: the latest **49-test suite** includes PostgreSQL reader/anonymous isolation, duplicate retries, stale edits/Undo and preference-preserving reset. Hosted Reduce and Undo were saved and verified through the UI, restoring the original signal. Live reset was not executed on the reader's account. Mobile layouts and SVG assets were checked against the design; private caches clear at logout and reader changes.

## Remaining service limitations

- **Email:** controlled confirmation/reset delivery is verified, but custom SMTP is still off. Supabase's default service is intended for development and restricts recipients/rates; configure SMTP and verify a non-team inbox before public signup. See [Supabase SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp).
- **Notifications:** open-app reminders depend on browser support and permission; no background push/email scheduler or guaranteed delivery.
- **Google Books/Gemini:** outages, timeouts, quota, credential/model configuration or insufficient catalogue candidates can interrupt search/recommendations and book insights. Drafts remain available for retry; manual entry and existing Library tracking do not require successful AI generation. Missing covers/facts stay visibly missing. Recommendation fit is provisional, not guaranteed accuracy.
- **Supabase/offline:** authentication and durable saves need a reachable project. Cached/open-tab recovery does not guarantee offline app launch; conflicts need reader review. Local tests do not replace final hosted privacy and production smoke checks.

The [risks update](docs/RISKS_UPDATE.md) records impact, current safeguards, remaining checks and the milestone plan.
