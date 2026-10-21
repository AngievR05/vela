# Application API reference

MVP 1.0.0 · source-reviewed 21 October 2026. Base URL is the deployed app origin; examples use relative paths. [Architecture](TECHNICAL.md) · [data model](DATA_MODEL.md).

## Conventions

All `/api/*` endpoints require a verified Supabase session cookie. They are same-origin application APIs, not a service-role/admin API. The server derives identity; do not send `userId`, candidates or arbitrary evidence as authority. JSON writes use `Content-Type: application/json`. File import is a JSON batch after browser parsing, not multipart upload.

Private responses are marked `Cache-Control: private, no-store` by Proxy and/or handlers. Common errors use `{ "error": "reader-facing message" }`; some validation errors also contain details/fields. There is no universal success envelope: use the endpoint-specific shape below.

| Status | Meaning / client action |
| --- | --- |
| 400 | Invalid body/query or confirmation; retain editable fields and correct them |
| 401 | No verified session, or missing/expired deletion verification; authenticate again |
| 404 | Invalid/unavailable record ID; reader-inaccessible records must not expose another reader's data |
| 409 | Stale edit or changed permission/signal; refresh before retrying |
| 413 | Import batch text exceeds the handler limit |
| 502 | Catalogue search failed/quota; retry or use manual entry |
| 503 | Auth/database/provider unavailable, paused or not configured; retain input and retry |

Not every endpoint uses every status. Upstream 429 is generally surfaced through a recovery error/cooldown rather than a public 429 response. Cover lookup is an image redirect, not a JSON success response.

## Read and catalogue endpoints

| Method / path | Input | Success |
| --- | --- | --- |
| `GET /api/home` | Session | Validated Home snapshot: reader ID/name, visible books, permissions and signals |
| `GET /api/books/search` | `q`: 2–200 chars; `maxResults`: 1–20, default 10 | `{ books: [...] }`, normalized catalogue results |
| `GET /api/books/[id]` | Google volume ID: 1–100 letters, digits, `_` or `-` | `{ book }` catalogue facts; 404 if unavailable |
| `GET /api/library/[id]` | Reader Library UUID, not Google ID | `{ book }` for this reader |
| `GET /api/library/[id]/cover` | Visible reader Library UUID | **307** `Location` to verified Google image; 404 if no match; 503 with `Retry-After: 60` if temporarily unavailable |
| `POST /api/library/[id]/insights` | Reader Library UUID; no body required | `{ clues: { pace, moods, tropes } }`; supported clues carry verified evidence, unknowns remain empty/null |
| `GET /api/stats` | Session | Reader's finished-book records and derived stats inputs |
| `GET /api/reading-setup` | Session | Saved preferences, independent permissions, enabled/completed state |
| `GET /api/dna` | Session | DNA snapshot, signals/evidence, permission and Undo state |
| `GET /api/settings` | Session | Reader profile, email/pending email, preferences and permissions |

Manual/private books without public source descriptions return empty insights; they are not submitted to Gemini. Cover resolution advertises a 90-second server duration; the host's actual timeout still applies.

## Library writes

| Method / path | Body | Success |
| --- | --- | --- |
| `POST /api/library` | `{ googleBooksId, status? }`; status `want_to_read` (default) or `reading` | `{ added, book, duplicate?, restored? }`; duplicate saves preserve existing history |
| `POST /api/library/manual` | `{ entryId, title, author, isbn, pageCount }`; UUID, nonblank strings, checksum-valid ISBN or `""`, positive pages or null | Saved reader-private book result |
| `PATCH /api/library/[id]` | Validated discriminated mutation; body `id` must match path | Saved mutation result including `book`; specialized operations can include operation/Undo metadata |
| `POST /api/library/import` | `{ rows: [...] }`, 1–10 validated normalized import rows | `{ results: [...] }` with per-row saved/skipped/error outcomes |

The import handler accepts at most 80,000 text characters per JSON batch (413 beyond it), separate from the browser CSV file limit of 2 MB/2,000 rows. The UI uses smaller batches. Exact row fields/limits are in [`importRowSchema`](../src/lib/library-import.js); a raw Goodreads row is not the API shape. The route advertises `maxDuration=180`, subject to the deployment host.

Library mutation kinds and source-of-truth schemas:

| `kind` | Additional fields / intent |
| --- | --- |
| `progress` | `percent` 0–100 integer, optional exact `page`, `note`, operation ID and expected timestamp |
| `start` | Start Reading; optional expected timestamp |
| `status` | Shelf status; DNF additionally validates reason and learning choice |
| `review` | Whole-star `rating` or null, `notes`, `favourite`, optional `ratingUse` |
| `reflection` | Structured `feedback` choices and required expected timestamp |
| `remove`, `restore` | Soft hide/restore Library record; remove supports expected timestamp |
| `finish` | Operation/version fields, nullable start date, required end date, optional rating, notes, structured feedback and explicit learning boolean |
| `dnf` | Operation/version fields, start/stopped date, reason choices, private reason and learning boolean |
| `reading_dates` | Operation/version fields, nullable start/finish/stopped dates |
| `restore_reading` | Operation/version fields; return set-aside book to Reading |
| `undo_reading` | Operation/version fields and saved update UUID |

See [`bookMutationSchema`](../src/lib/home-data.js), [`detailMutationSchema`](../src/lib/library-data.js), and [`readingFlowMutations`](../src/lib/reading-flow.js). Reuse the operation UUID for retry of the same action; take timestamps from the latest server response. Some legacy mutation variants have optional concurrency fields; do not assume every PATCH has identical guarantees.

Example of a progress request from an already authenticated browser:

```js
const response = await fetch(`/api/library/${book.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    kind: "progress", id: book.id, percent: 45, page: 122,
    operationId: operationIdForThisEdit,
    expectedUpdatedAt: book.updatedAt
  })
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
// Replace local saved state with result.book; do not invent a new timestamp.
```

This is a contract example, not an instruction to mutate a real reader while documenting. Percentages should be computed from the actual edition length; the UI's progress helper handles rounding and bounds.

## Setup, recommendations and DNA

| Method / path | Input | Success |
| --- | --- | --- |
| `PUT /api/reading-setup` | `{ preferences: { genres, storyElements, pacing, moods }, permissions: { ratings, dnf, history }, enabled }` | `{ saved: true }` after atomic setup save |
| `GET /api/recommendations` | Optional `?session=<UUID>`; otherwise latest session | `{ session }`, including null when none exists |
| `POST /api/recommendations` | `{ entryId, request, filters }`; UUID, 2–240 chars, validated filter enums | `{ session }` with three saved results, or `{ state: "context" }` / `{ state: "no-match" }` |
| `POST /api/recommendations/[id]/feedback` | Recommendation UUID and feedback schema below | `{ session }` with refreshed saved state |
| `PATCH /api/dna` | DNA mutation below | `{ saved: true, changeId, snapshot }` |

Recommendation filters: `source` is `anywhere` or `tbr`; `genre` is empty, `Fantasy`, `Romance` or `Literary`; `mood` is empty, `Emotional`, `Hopeful` or `Dark`; `length` is `any`, `300` or `500` (strictly under that page limit). Generation advertises 180 seconds; the frontend timeout and host limits are separate. Full contracts are in [`validation/recommendation.js`](../src/lib/validation/recommendation.js).

Feedback bodies:

```json
{ "action": "helpful" }
```

Other actions: `not_for_me` requires a nonblank reason (max 250 chars); `show_less` and `undo_less` set/reverse a future preference; `correct` requires `signalId` and `correction` (`keep`, `reduce`, `remove`). Current permissions and allowed signal IDs are rechecked. Helpful/rejection alone does not alter DNA.

DNA mutations: `keep`/`reduce`/`remove` require `operationId`, `signalId` and `expectedUpdatedAt`; `undo` requires `operationId` and `changeId`; `reset` requires `operationId` and `confirmation: "RESET"`. Reset preserves Library, setup choices and permissions. See [`dnaMutationSchema`](../src/lib/reading-dna.js).

## Account and settings

| Method / path | Input | Success |
| --- | --- | --- |
| `PATCH /api/settings` | `kind: profile` + `name`; `preferences` + complete preferences object; or `permissions` + enabled/ratings/history/dnf booleans | Updated settings snapshot |
| `GET /api/settings/export` | Session | JSON archive `format: vela-account-export-v1`, attachment filename `vela-account.json` |
| `PATCH /api/stats/books/[id]` | Finished Library UUID and complete reading-record input, including expected version | `{ saved: true }`; conflict returns 409 |
| `POST /api/account` | `kind: email` + new email/password, or `kind: verify-delete` + password | Updated email/pending email, or `{ verified: true }` and short-lived deletion cookie |
| `DELETE /api/account` | Exactly `{ confirmation: "DELETE" }` plus recent verified cookie | `{ deleted: true }`, then local sign-out |

`settingsMutationSchema` also recognizes a legacy reset request; the current UI uses the dedicated DNA reset flow. Preference and stats input schemas are in [`reader-settings.js`](../src/lib/reader-settings.js) and [`reading-stats.js`](../src/lib/reading-stats.js). Stats updates accept optional descriptive facts but require the saved-record version.

Export contains this reader's account/profile, Library with referenced book facts, signals, recommendation sessions/results/feedback, AI settings and available stats/DNA-change/reading-update records. It is private JSON, not a CSV export. Its current pagination guard refuses oversized exports instead of returning a partial archive.

## Authentication routes outside `/api`

`GET /auth/callback` handles a Supabase PKCE code. `GET /auth/confirm` handles token hash/type email confirmation/recovery. These are callback links supplied by Supabase, not manually callable login forms. Tokens/codes are verified and stripped from the destination. Configure the intended redirect origin as described in [deployment](DEPLOYMENT.md#authentication-and-email).

Signup, login, password update/recovery and local logout use Supabase Auth client methods in [`auth/requests.js`](../src/lib/auth/requests.js). There is no application admin endpoint, public unauthenticated Library API or service-role bypass contract.
