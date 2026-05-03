-- Hidden expenses (privacy "from a glance") + 4-digit PIN gate.
--
-- IMPORTANT caveat:
--   A 4-digit PIN has only 10000 combinations. SHA-256 of a 4-digit PIN can be brute-forced
--   in <1 second by anyone with read access to the database. This is a CONVENIENCE feature
--   (hide names/categories from someone glancing at the screen), NOT real security.
--   Do NOT rely on it to protect data from a determined attacker.

-- ===== expenses.hidden flag =====
alter table public.expenses
  add column if not exists hidden boolean not null default false;

create index if not exists expenses_hidden_idx
  on public.expenses(profile_id, hidden, occurred_on);

-- ===== profiles: PIN hash + settings JSON =====
alter table public.profiles
  add column if not exists hidden_pin_hash text;

alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;
