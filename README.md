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

- Google Books has a basic server search route.
- Supabase authentication and protected routes are implemented; hosted email configuration is required.
- The recommendation request and response schemas are prepared.
- The Gemini recommendation route is scaffolded but intentionally returns `501` until the Week 5 AI implementation.
- The five main product areas are represented: Home, Library, Discover, DNA and Settings.
- Vela's colour tokens and mobile-first visual foundation are included.

See `docs/PROJECT_SCOPE.md` and `docs/FOLDER_STRUCTURE.md` before adding features.

## Authentication

Email/password sign-up, login, logout, password recovery, persistent cookie sessions and protected app/API routes are implemented. See [Supabase setup and verification](supabase/README.md) for migrations, email redirect configuration and security checks. Run `npm test` for return-route safety and PostgreSQL RLS tests.

The entry and authentication UI follows Figma’s **A · Entry and Authentication** section. `/` verifies the saved session, `/welcome` presents the entry choices, and the forms display focused, validation, pending, connection-error and success states. The supplied logo and decorative SVGs are local assets; Cormorant Garamond and Geist are bundled under their OFL licenses. Device status bars and home indicators belong to the device rather than the web page.

Live account and email checks require a reachable Supabase project, the schema migration, and allowed callback URLs for the port or deployed origin in use. The PostgreSQL test suite verifies the checked-in policies; it does not assert that a hosted project has applied them.
