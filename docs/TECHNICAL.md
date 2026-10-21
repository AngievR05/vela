# Technical architecture

MVP 1.0.0 · reviewed against repository source on 21 October 2026. [README](../README.md) · [APIs](API.md) · [data model](DATA_MODEL.md) · [deployment](DEPLOYMENT.md) · [testing](TESTING.md).

## Runtime and package boundaries

Vela is one Next.js App Router application, not a separate SPA and backend service. React client components handle interactive flows; server layouts and Route Handlers authenticate readers and access Supabase. JavaScript modules, CSS Modules and shared CSS tokens are used throughout. The exact runtime/development package versions and installation commands are in the [README](../README.md#packages), backed by [package.json](../package.json) and the lockfile.

Supabase supplies Auth, PostgreSQL, RLS and transactional RPCs. The application uses a publishable key plus the reader's session; it does not require an application service-role environment key. Google Books supplies public catalogue data, Gemini supplies validated structured interpretations, and Open Library can supply verified ISBNs for cover recovery. There is no separate worker, Redis, object-storage upload pipeline or service worker in this MVP.

![Architecture and privacy boundaries](images/architecture.svg)

## Source map

| Location | Responsibility |
| --- | --- |
| `src/app/(auth)` | Welcome, signup/login, recovery/reset and legal pages |
| `src/app/(setup)/setup` | Protected optional reading setup |
| `src/app/(app)` | Protected Home, Library, Discover, DNA, Stats and Settings |
| `src/app/api` | Authenticated application HTTP contracts |
| `src/app/auth` | Code-exchange and token-hash email callback handlers |
| `src/proxy.js` | Session verification/refresh, protected-route denial and private response headers |
| `src/components/ui`, `feedback`, `navigation`, `layout` | Shared semantic controls, sheets/dialogs and responsive shells |
| `src/components/{home,library,reading,discover,dna,stats,settings,setup,auth}` | Product screens and their local styles/hooks |
| `src/lib/env`, `supabase`, `auth` | Validated config, clients, verified identity and safe return destinations |
| `src/lib/reader-library.js`, `home-data.js`, `reading-flow.js` | Reader data access, validated snapshots, transitions and mutation contracts |
| `src/lib/recommendation-data.js`, `validation/recommendation.js` | Permitted context, canonical candidates, generated-output checks and persistence |
| `src/lib/reading-dna.js`, `reading-stats.js`, `reader-settings.js` | Domain validation and derivation; corresponding server modules load private data |
| `src/lib/google-books*`, `gemini*`, `provider-policy.js` | Server provider wrappers, retries and quota/billing guards |
| `src/lib/library-import.js`, `cover-resolution.js`, `isbn-catalogue.js` | CSV matching and lazy cover repair |
| `src/styles`, `public` | Tokens, licensed local fonts, logo/artwork, CSV template and local assets |
| `supabase/migrations`, `tests` | Ordered schema/RPC changes and executable domain/privacy tests |
| `docs/evidence` | Dated, sanitized verification results; not runtime data |

Route groups in parentheses organize source/layouts; they do not appear in URLs. `src/proxy.js` is the installed Next.js version's convention. Before changing framework APIs, read the relevant guide under `node_modules/next/dist/docs/`, as required by [AGENTS.md](../AGENTS.md).

## Authentication and authorization

1. The browser uses the Supabase Auth SDK through the cookie-aware browser client. Signup/login/reset are not custom `/api/login` endpoints.
2. `proxy` validates the session with `auth.getUser()`, propagates refreshed cookies, and redirects an unsigned page request to login with a validated local return destination. Unsigned APIs return 401. Temporary authentication failure returns retryable 503 rather than falsely expiring the account.
3. Protected layouts and API handlers recheck the reader through `getReader()`. Request-supplied owner IDs are not used as authorization.
4. The server's Supabase client carries the reader session. RLS, grants, ownership constraints and atomic functions enforce database boundaries even if frontend controls are bypassed.
5. `/auth/callback` exchanges a PKCE authorization code. `/auth/confirm` verifies a token hash. Both validate destinations; recovery requires a verified recovery session before a password update.
6. Session synchronization rechecks readers after visibility/history events. Local-scope logout clears private caches for this browser; other devices retain their own sessions.

Account deletion is exceptional: password verification creates a five-minute HTTP-only cookie scoped to `/api/account`; deletion checks that token's user and the database checks recent password authentication and typed confirmation. Email changes also require password verification and confirmed delivery. See [API](API.md#account-and-settings) and [Supabase setup](../supabase/README.md).

## State, recovery and concurrency

Supabase is the durable source of truth. Controlled forms retain input after recoverable failures. Zod validates request bodies and restored cached data. Browser caches are scoped to the verified reader, and origin/session boundaries are preserved.

Home/Library snapshots, selected recommendation results, DNA, stats and settings have validated recovery copies. Setup uses reader-scoped session storage for its draft; Discover retains a request/filter draft. A durable start/progress queue can sync on reconnect. This is recovery for already loaded/open pages, not guaranteed cold offline launch.

Reading operations use explicit mutation kinds. Finish/DNF/date/Undo requests carry operation UUIDs and expected timestamps; progress has operation/version support as well. The database records before-state and results for retry safety. Duplicate add does not reset existing progress; stale changes fail instead of overwriting newer reading. Removal is a soft hide with Undo. **Saving 100% does not finish the book.**

After relevant mutations, `reading-activity-events.js` notifies Home/Stats/DNA/Discover. Database activity triggers refresh permitted inferred evidence. Explicit global permissions, per-book learning choices, stopped/reduced signals and reset cutoffs continue to apply. A completed book is not proof of liking it.

## Recommendation pipeline

1. Validate the current request, filter enums and retry UUID on the server.
2. Load only this reader's permitted signals and activity. Respect personalisation-off, independent ratings/history/DNF permissions, explicit corrections, reset cutoff and separate Show less preferences.
3. Ask Gemini for a bounded search plan and possible public book leads. Leads are not accepted as verified books.
4. Retrieve Google Books candidates, enrich canonical facts, filter length/genre/exclusions as supported, and deduplicate works/editions.
5. Request exactly three reasonable distinct works or no result. Validate the generated IDs against supplied candidates and signal IDs; quote evidence must occur in supplied facts. Unsupported or thin evidence cannot justify Strong match.
6. Atomically persist the complete session and results. Return the saved session to the UI. Fewer than three suitable candidates produces no-match; partial catalogue outage remains retryable.

Reasons and confidence labels are interpretations, not objective accuracy scores. Metadata cannot prove absent content or reading order when it omits those facts. Helpful/ordinary rejection is session feedback; it does not silently modify DNA. Show less is an explicit future preference; Keep/Reduce/Remove target a chosen structured signal. These are separately validated and consent-checked.

The Gemini wrapper is server-only, gated by `GEMINI_FREE_TIER_VERIFIED` and `GEMINI_ENABLED`, with an approved model allowlist, bounded transient retries, JSON repair and 429 cooldown. Cooldowns/caches are process-local; they are not a distributed quota meter or spending cap. No code fallback enables paid billing. See [provider audit](security-quota-audit-2026-10-18.md).

## Provider data boundary

| Destination | Data needed for the feature | Excluded by application construction |
| --- | --- | --- |
| Google Books | Search text, public title/author/ISBN or Google volume ID | Account credentials, private notes, private ratings/reflections as a raw payload |
| Gemini recommendations | Current user-entered request, public candidate facts, permitted structured signals/activity and corrections | Private notes, account credentials and opted-out evidence |
| Gemini book insights | Reader-owned catalogue book's public description/facts | Private notes/history/ratings; manual private books are not submitted |
| Open Library cover fallback | Public title/author to identify an ISBN | Private notes/ratings/account data |
| Browser image request | Verified Google Books image URL | Server provider API keys |

Readers control what they type into a search/request; the app does not redact arbitrary personal information voluntarily typed there. The exclusion claims concern stored private fields assembled by the server. Logs must not contain request bodies, passwords, tokens or provider keys.

## CSV and cover pipeline

CSV is parsed and previewed in browser memory: UTF-8, up to 2 MB and 2,000 rows, with duplicate headers, quoting, ISBN/date/status/rating validation. The UI sends small validated JSON batches, not an uploaded public CSV object. Each row is atomic and retryable. Existing rows are skipped without overwriting history.

Equivalent ISBN-10/13 or a verified title/author work match can attach Google metadata. An unmatched row becomes private manual metadata. Import never enables AI permissions.

`BookCover` uses an existing safe Google URL first. A missing imported cover requests `/api/library/[id]/cover` lazily as it approaches the viewport. The endpoint checks the reader's visible book before external lookups, tries ISBN/volume/work matching, and can resolve missing ISBNs through a paced Open Library lookup. It redirects to a verified Google image; it does not rewrite the reading record. Positive/negative caches, request coalescing, quota backoff and one delayed UI retry bound traffic. No verified image means an honest placeholder, not an unrelated cover.

## Semantic components, styling and accessibility

Reuse `Button`, text/password/search fields, fieldsets/radios/checkboxes, `BookCover`, navigation shells, `BottomSheet` and `ConfirmationDialog`. `ReadingFlow` is the shared progress/finish/DNF editor from Home, Book Detail and Current Reading; `ReflectionEditor` edits saved structured reflection independently.

Use links for navigation and buttons for actions. Keep labels, validation associations, loading/disabled states, focus visibility and dirty-edit guards. Sheets/dialogs manage focus and dismissal. Theme, larger text, reduced motion, spacing and contrast use the reader preference runtime and CSS tokens. These conventions support accessibility but do not constitute a complete accessibility audit.

Phone layouts use bottom navigation; desktop retains a persistent sidebar. Responsive CSS adapts content columns rather than scaling a phone image. Native device keyboards and status/home indicators are not drawn in the UI. SVG/logo/font assets are local; temporary Figma URLs are not runtime assets. Product screenshots and their source are listed in [images](images/README.md).

## Extension rules

- Validate new contracts server-side and derive ownership from the verified session.
- Keep provider secrets in server-only modules and public config limited to the two Supabase variables.
- Add new schema changes as later migrations; do not rewrite already-applied migration history.
- Preserve learning permissions and private-field exclusions when extending AI context.
- Keep pure domain logic importable by Node tests; keep provider and UI adapters at their boundaries.
- Add meaningful regression/RLS checks for data-affecting changes, then run the [verification workflow](TESTING.md).
- Do not retag an existing stable milestone; document later fixes separately.
