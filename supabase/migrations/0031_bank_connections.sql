-- Open Banking integration tables (GoCardless Bank Account Data, formerly Nordigen).
--
-- Three tables:
--   bank_connections      — one row per bank account the user has linked. Stores
--                            provider IDs (requisition + account) and consent expiry
--                            so we can prompt re-consent at the 90-day PSD2 limit.
--   bank_transactions     — raw tranzacții pulled from the provider. Stays as the
--                            source of truth even if the user disconnects (history
--                            preserved). Linked to an `expenses` row via expense_id
--                            when a rule matched and we imported it.
--   bank_import_rules     — per-profile keyword → category/subcategory rules. Seeded
--                            with 6 defaults at signup (see migration 0032), editable
--                            from the bank connections UI.
--
-- Idempotent — safe to re-run.

-- ---------- bank_connections ----------
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'gocardless',
  provider_requisition_id text not null,
  provider_account_id text not null,
  institution_id text not null,
  institution_name text not null,
  iban text,
  status text not null default 'active'
    check (status in ('active', 'expired', 'disconnected', 'error')),
  consent_expires_at timestamptz,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_account_id)
);

create index if not exists bank_connections_profile_idx
  on public.bank_connections(profile_id);
create index if not exists bank_connections_status_idx
  on public.bank_connections(status) where status = 'active';

alter table public.bank_connections enable row level security;

drop policy if exists "members all" on public.bank_connections;
create policy "members all" on public.bank_connections
  for all
  using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
  with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()));

-- ---------- bank_transactions ----------
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  provider_transaction_id text not null,
  booked boolean not null default true,
  amount numeric(12, 2) not null,
  currency text not null,
  merchant_name text,
  description text,
  occurred_on date not null,
  raw jsonb,
  -- FK to bank_import_rules added at the end of this migration (after that table exists).
  matched_rule_id uuid,
  expense_id uuid references public.expenses(id) on delete set null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'imported', 'skipped', 'ignored')),
  created_at timestamptz not null default now(),
  unique (connection_id, provider_transaction_id)
);

create index if not exists bank_transactions_profile_idx
  on public.bank_transactions(profile_id);
create index if not exists bank_transactions_status_idx
  on public.bank_transactions(profile_id, status);
create index if not exists bank_transactions_occurred_idx
  on public.bank_transactions(profile_id, occurred_on desc);

alter table public.bank_transactions enable row level security;

drop policy if exists "members all" on public.bank_transactions;
create policy "members all" on public.bank_transactions
  for all
  using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
  with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()));

-- ---------- bank_import_rules ----------
create table if not exists public.bank_import_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Each keyword is matched against a normalized form of the merchant name (lowercase,
  -- diacritics stripped, all non-alphanumerics removed). So "mega image" stored here
  -- matches "MEGA IMAGE 1234 RO", "MegaImage S.A.", "MEGAIMAGE", etc. against the same row.
  keywords text[] not null check (array_length(keywords, 1) > 0),
  category_id uuid references public.categories(id) on delete cascade,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  tags text[] not null default '{}'::text[],
  priority int not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists bank_import_rules_profile_idx
  on public.bank_import_rules(profile_id) where enabled = true;

alter table public.bank_import_rules enable row level security;

drop policy if exists "members all" on public.bank_import_rules;
create policy "members all" on public.bank_import_rules
  for all
  using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
  with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()));

-- ---------- foreign key from bank_transactions.matched_rule_id ----------
-- Added after both tables exist (avoids the chicken/egg of cross-FK).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'bank_transactions_matched_rule_id_fkey'
  ) then
    alter table public.bank_transactions
      add constraint bank_transactions_matched_rule_id_fkey
      foreign key (matched_rule_id) references public.bank_import_rules(id) on delete set null;
  end if;
end $$;
