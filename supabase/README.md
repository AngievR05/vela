# Supabase plan

The MVP data model is expected to contain:

- `profiles`
- `books`
- `user_books`
- `reading_dna_signals`
- `ai_settings`
- `recommendation_sessions`
- `recommendations`
- `recommendation_feedback`

`user_books` is the Library CRUD backbone.

`reading_dna_signals` stores structured, editable personalisation signals with evidence/source and an active state.

Row Level Security must ensure an authenticated reader can access only their own application data.

SQL migrations will be added to `supabase/migrations/` when the database schema is implemented. Keeping the folder empty now avoids locking the project into an untested schema before Supabase is created.
