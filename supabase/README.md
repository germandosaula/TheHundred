# Supabase Setup

## Required env

- `REPOSITORY_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Order

1. Apply `supabase/migrations/20260301_001_initial_schema.sql`
2. Apply `supabase/policies/001_base_rls.sql`
3. Apply `supabase/seeds/dev.sql` if you want local demo data
4. Start the API with `REPOSITORY_PROVIDER=supabase`

## CLI

- Use `npm run supabase:login`
- Use `npm run supabase:link -- --project-ref <project_ref>`
- Use `npm run supabase:push`
- The repo uses `npx supabase`, so no global CLI install is required

## Notes

- The schema uses `gen_random_uuid()` defaults, so normal inserts do not need explicit IDs.
- The current API uses the service role key, so RLS policies are prepared for future direct client access but are not the enforcement layer yet.
- Session storage is still in-memory even when the repository provider is `supabase`.
