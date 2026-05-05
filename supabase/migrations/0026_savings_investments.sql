-- Section "Economii & Investiții" — separate from expense tracking entirely.
-- Savings deposits and investment buys are NOT expenses (money isn't consumed,
-- it's transferred to another account / asset class). Tracking them as expenses
-- inflates personal spending totals; tracking them in dedicated tables keeps the
-- expenses table semantically clean.
--
-- This migration:
-- 1. Creates `savings_transactions` and `investment_transactions` (with RLS).
-- 2. Migrates any existing expenses linked to subcategories with slug 'savings' or
--    'investments' into the new tables (preserving FX/date/note/amount_ron history).
-- 3. Deletes those rows from `expenses` so they no longer pollute totals.
-- 4. Drops the `savings` and `investments` subcategories from all profiles.
--
-- Idempotent: safe to re-run.

-- ───────────── savings_transactions ─────────────

create table if not exists public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'RON',
  amount_ron numeric(12, 2) not null,
  fx_rate numeric(12, 6),
  fx_rate_date date,
  direction text not null check (direction in ('in', 'out')),
  account_name text,
  occurred_on date not null,
  note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists savings_transactions_profile_date_idx
  on public.savings_transactions(profile_id, occurred_on desc);

alter table public.savings_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_transactions' and policyname = 'savings_members_all'
  ) then
    execute $p$
      create policy savings_members_all on public.savings_transactions
        for all
        using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
        with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- ───────────── investment_transactions ─────────────

create table if not exists public.investment_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'RON',
  amount_ron numeric(12, 2) not null,
  fx_rate numeric(12, 6),
  fx_rate_date date,
  direction text not null check (direction in ('in', 'out')),
  instrument_type text not null check (instrument_type in (
    'pension', 'etf', 'mutual_fund', 'stock', 'bonds', 'crypto', 'real_estate', 'other'
  )),
  broker text,
  occurred_on date not null,
  note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists investment_transactions_profile_date_idx
  on public.investment_transactions(profile_id, occurred_on desc);
create index if not exists investment_transactions_instrument_idx
  on public.investment_transactions(profile_id, instrument_type);

alter table public.investment_transactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'investment_transactions' and policyname = 'investments_members_all'
  ) then
    execute $p$
      create policy investments_members_all on public.investment_transactions
        for all
        using (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
        with check (profile_id in (select profile_id from public.profile_members where user_id = auth.uid()))
    $p$;
  end if;
end $$;

-- ───────────── migrate existing expenses ─────────────

-- Move any expense currently linked to a 'savings' subcategory into savings_transactions
insert into public.savings_transactions
  (profile_id, name, amount, currency, amount_ron, fx_rate, fx_rate_date, direction, occurred_on, note)
select
  e.profile_id, e.name, e.amount_original, e.currency_original, e.amount_ron,
  e.fx_rate, e.fx_rate_date, 'in', e.occurred_on, e.note
from public.expenses e
join public.subcategories s
  on s.id = e.subcategory_id and s.profile_id = e.profile_id and s.slug = 'savings';

-- Move any expense currently linked to an 'investments' subcategory into investment_transactions
insert into public.investment_transactions
  (profile_id, name, amount, currency, amount_ron, fx_rate, fx_rate_date, direction, instrument_type, occurred_on, note)
select
  e.profile_id, e.name, e.amount_original, e.currency_original, e.amount_ron,
  e.fx_rate, e.fx_rate_date, 'in', 'other', e.occurred_on, e.note
from public.expenses e
join public.subcategories s
  on s.id = e.subcategory_id and s.profile_id = e.profile_id and s.slug = 'investments';

-- Delete the moved expenses (so they don't double-count)
delete from public.expenses e
using public.subcategories s
where s.id = e.subcategory_id and s.slug in ('savings', 'investments');

-- Finally drop the subcategories themselves
delete from public.subcategories where slug in ('savings', 'investments');
