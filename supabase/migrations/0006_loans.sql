-- Loans (Rate) — recurring monthly installment payments to a bank.
-- Distinct from subscriptions: have a bank, a fixed end date, optional interest rate,
-- and stop generating expenses after end_date.

create table if not exists public.loans (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  name                text not null,
  bank                text,                                       -- 'BCR', 'ING', etc.
  total_amount        numeric(12,2),                              -- principal (optional, for context)
  monthly_payment     numeric(12,2) not null,
  currency            text not null default 'RON',
  charge_day          int  not null check (charge_day between 1 and 31),
  start_date          date not null default current_date,
  end_date            date,                                       -- null = open-ended
  interest_rate       numeric(5,2),                               -- annual %, optional
  category_id         uuid references public.categories(id) on delete set null,
  subcategory_id      uuid references public.subcategories(id) on delete set null,
  active              boolean not null default true,
  note                text,
  created_at          timestamptz not null default now()
);
create index if not exists loans_profile_active_idx on public.loans(profile_id, active);

-- Allow 'loan' as an expense source (extends 'manual'|'subscription'|'fixed')
alter table public.expenses drop constraint if exists expenses_source_check;
alter table public.expenses
  add constraint expenses_source_check
  check (source in ('manual','subscription','fixed','loan'));

-- Idempotency for loan-generated expenses (mirrors the subscription unique index)
create unique index if not exists expenses_loan_unique_idx
  on public.expenses(profile_id, source_ref_id, occurred_on)
  where source = 'loan';

-- RLS
alter table public.loans enable row level security;
drop policy if exists "members all loans" on public.loans;
create policy "members all loans"
  on public.loans for all
  using (profile_id in (select public.user_profile_ids()))
  with check (profile_id in (select public.user_profile_ids()));
