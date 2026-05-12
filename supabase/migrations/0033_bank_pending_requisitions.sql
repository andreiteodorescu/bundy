-- Short-lived table that maps a requisition reference (we generate it) to the
-- profile that initiated the GoCardless flow. Used by the /api/bank/callback
-- endpoint to verify ownership before creating bank_connections.
--
-- Rows are deleted after callback succeeds (or expire automatically — older than
-- 24h means the user never completed the bank auth flow, so the requisition is
-- dead anyway).
--
-- Idempotent.

create table if not exists public.bank_pending_requisitions (
  reference text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  requisition_id text not null,
  institution_id text not null,
  institution_name text,
  created_at timestamptz not null default now()
);

create index if not exists bank_pending_requisitions_profile_idx
  on public.bank_pending_requisitions(profile_id);

alter table public.bank_pending_requisitions enable row level security;

drop policy if exists "members all" on public.bank_pending_requisitions;
create policy "members all" on public.bank_pending_requisitions
  for all
  using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
  with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()));

-- Cleanup helper: a function that wipes rows older than 24h. Call from any cron,
-- or just let them accumulate (small table).
create or replace function public.cleanup_bank_pending_requisitions()
returns void
language sql
as $$
  delete from public.bank_pending_requisitions
  where created_at < now() - interval '24 hours';
$$;
