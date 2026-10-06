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
