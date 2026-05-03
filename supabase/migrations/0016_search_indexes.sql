-- Performance indexes for the in-app search.
--
-- pg_trgm + GIN trigram indexes make ILIKE '%foo%' queries fast — without these,
-- every search would do a sequential scan of the entire expenses table. With trigram
-- indexes, ILIKE on a 100K-row table runs in <50ms.
--
-- pg_trgm is preinstalled on Supabase free tier; CREATE EXTENSION IF NOT EXISTS is safe.

create extension if not exists pg_trgm;

create index if not exists expenses_name_trgm_idx
  on public.expenses using gin (name gin_trgm_ops);

create index if not exists expenses_note_trgm_idx
  on public.expenses using gin (note gin_trgm_ops);
