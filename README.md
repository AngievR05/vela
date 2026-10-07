# Vela

**Your reading life, intelligently organised.**

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

1. Unzip this folder.
2. Open the folder in VS Code.
3. Install dependencies:

```bash
npm install
```

This will create `package-lock.json`. Commit that file to GitHub.

4. Copy the environment template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

5. Add your Supabase, Gemini and Google Books values to `.env.local`.
6. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

For another device on the same Wi-Fi, use `http://192.168.3.7:3000` and sign in there separately; sessions and offline caches belong to each browser origin. The development server allows that exact network hostname. If your computer’s IP changes, update `allowedDevOrigins` in `next.config.mjs` and the Supabase callback allowlist. Manual books and recommendation IDs use secure random bytes even on LAN HTTP, and book sharing offers selectable text when native sharing/clipboard is unavailable.

## Git setup

If this folder is not already inside your GitHub repository:

```bash
git init
git add .
git commit -m "chore: initialise Vela project structure"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Use `main` as the stable branch and create short feature branches such as:

```text
feature/auth
feature/library-crud
feature/google-books
feature/reading-dna
feature/recommendations
feature/privacy-controls
```

Example commits:

```text
feat: add Supabase authentication
feat: add Google Books search
feat: create Reading DNA signals
fix: validate recommendation JSON
style: add mobile navigation
docs: update README
```

## Important security rule

Never commit `.env.local`.

`GEMINI_API_KEY` is server-only. Do not expose it in a browser component and do not rename it with the `NEXT_PUBLIC_` prefix.

## Current scaffold

This starter deliberately sets up the project architecture without pretending unfinished features are complete.

- Google Books search and canonical metadata lookup power book discovery and saving to the reader's Library.
- Supabase authentication and protected routes are implemented; hosted email configuration is required.
- Reading setup, editable taste choices and independent data permissions are saved through a reader-protected Supabase operation.
- Discover creates three validated Gemini recommendations using canonical Google Books metadata and the reader’s permitted preferences.
- Recommendation sessions, feedback and explicit Reading DNA corrections persist in Supabase.
- The five main product areas are represented: Home, Library, Discover, DNA and Settings.
- Vela's colour tokens and mobile-first visual foundation are included.

See `docs/PROJECT_SCOPE.md` and `docs/FOLDER_STRUCTURE.md` before adding features.

## Reading Home

`/home` follows Figma’s **C · Home** populated, no-current-book, new-reader, loading, offline and retry states. Greeting, current book, progress, annual finished count, rating average and permitted DNA evidence come from the authenticated reader’s Supabase data. Book search, adding to the Library, starting reading and saving progress use protected APIs; reaching 100% marks the book finished. Library shows saved books; Discover provides recommendations and protected catalogue details.

While an already-loaded Home is offline, reader-scoped local snapshots and a durable progress queue keep saved books usable. Updates sync after reconnection; conflicts remain visible for retry or explicit removal. Signing out or changing readers clears the old reader’s cached data. This is offline support for an open Home tab, not a service-worker-backed offline app launch.

No additional migration is needed beyond the two existing migrations. `npm test` exercises actual Home data operations against PostgreSQL with those migrations and reader/anonymous roles, including consent filtering, cross-reader denial, duplicate saves and reading transitions. Live account saves still need an authenticated hosted session to verify deployment-specific behavior.

## Authentication

Email/password sign-up, login, logout, password recovery, persistent cookie sessions and protected app/API routes are implemented. See [Supabase setup and verification](supabase/README.md) for migrations, email redirect configuration and security checks. Run `npm test` for return-route safety and PostgreSQL RLS tests.

The entry and authentication UI follows Figma’s **A · Entry and Authentication** section. `/` verifies the saved session, `/welcome` presents the entry choices, and the forms display focused, validation, pending, connection-error and success states. The supplied logo and decorative SVGs are local assets; Cormorant Garamond and Geist are bundled under their OFL licenses. Device status bars and home indicators belong to the device rather than the web page.

Live account and email checks require a reachable Supabase project, the schema migration, and allowed callback URLs for the port or deployed origin in use. The PostgreSQL test suite verifies the checked-in policies; it does not assert that a hosted project has applied them.

## Reading setup

`/setup` follows Figma’s **B · Reading Setup and Permissions** reference states: intro, genres, story elements, pacing, mood, AI explanation, separate data permissions, editable review, completion, skip confirmation and save error/retry. All taste steps are optional. The supplied logo and Figma SVG artwork are local assets. Form choices remain available after recoverable failures, and completed settings reload from Supabase. Settings and Reading DNA reopen the setup for changes or pausing personalisation.

Apply the migrations listed in [Supabase setup and verification](supabase/README.md). `npm test` checks validation, atomic saves, new-reader opt-out defaults and reader isolation using PostgreSQL. The recommendation engine consumes only currently permitted signals.

## Discover and recommendations

`/discover` implements Figma’s **J · Discover** and **K · Recommendations & Correction** states using Vela’s existing styling. Request and filter drafts survive recoverable errors and reloads. Source, genre, mood and length guide candidate selection; unavailable services, insufficient context and fewer than three eligible matches have explicit recovery states. Book covers open protected details with Google Books facts and Library save actions.

Apply `supabase/migrations/202610060003_recommendations.sql` after the earlier migrations. Sessions save three distinct validated recommendations atomically. Helpful and ordinary rejection feedback do not change Reading DNA. Show less records a separate future preference with Undo; Keep, Reduce and Remove change only the explicitly selected, permitted signal. Reader-scoped snapshots support browsing already-loaded results offline and clear on logout.

The server uses `GEMINI_API_KEY` with `gemini-3.5-flash-lite` by default; optional server-only `GEMINI_MODEL` overrides it. Google Books supplies canonical candidates, facts and covers. Client-provided candidates, reader IDs and evidence are rejected. Generated book and signal IDs must belong to the server’s allowed lists.

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

Notifications run only while Vela is open and browser permission is granted. Closed-app push and email scheduling are not configured. Supabase email delivery still requires the SMTP setup described in `supabase/README.md`. Hosted profile saves, CSV duplicate preservation, export and anonymous denial were verified; isolated browser checks verified appearance, larger text, retained choices and deletion safeguards. `npm test` covers CSV parsing, canonical matching, retry, PKCE email handling, verification identity, RLS and deletion freshness.
