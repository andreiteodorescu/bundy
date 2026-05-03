-- Quick expense templates (preț FIX, agregat zilnic via shopping-cart UX cu -/+).
-- Predefined expense templates (preț VARIABIL, tap pre-completează formularul).
--
-- Quick: tap [+] crește qty pe expense-ul agregat al zilei. Tap [-] îl scade. La 0 = DELETE.
-- Idempotent prin unique partial index (profile_id, source_ref_id, occurred_on) WHERE source='quick'.

-- ===== quick_expenses (template) =====
create table if not exists public.quick_expenses (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  amount          numeric(12,2) not null,
  currency        text not null default 'RON',
  category_id     uuid references public.categories(id) on delete set null,
  subcategory_id  uuid references public.subcategories(id) on delete set null,
  icon            text,
  sort_order      int  not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists quick_profile_sort_idx on public.quick_expenses(profile_id, sort_order);

-- ===== predefined_expenses (template) =====
create table if not exists public.predefined_expenses (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  default_currency text not null default 'RON',
  category_id     uuid references public.categories(id) on delete set null,
  subcategory_id  uuid references public.subcategories(id) on delete set null,
  icon            text,
  sort_order      int  not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists predefined_profile_sort_idx on public.predefined_expenses(profile_id, sort_order);

-- ===== expenses: source enum + quantity column =====
alter table public.expenses drop constraint if exists expenses_source_check;
alter table public.expenses
  add constraint expenses_source_check
  check (source in ('manual','subscription','fixed','loan','quick'));

alter table public.expenses add column if not exists quantity int;

-- Idempotency for quick aggregates: one row per (template, day)
create unique index if not exists expenses_quick_unique_idx
  on public.expenses(profile_id, source_ref_id, occurred_on)
  where source = 'quick';

-- ===== RLS =====
alter table public.quick_expenses enable row level security;
alter table public.predefined_expenses enable row level security;

drop policy if exists "members all quick_expenses" on public.quick_expenses;
create policy "members all quick_expenses" on public.quick_expenses
  for all
  using (profile_id in (select public.user_profile_ids()))
  with check (profile_id in (select public.user_profile_ids()));

drop policy if exists "members all predefined_expenses" on public.predefined_expenses;
create policy "members all predefined_expenses" on public.predefined_expenses
  for all
  using (profile_id in (select public.user_profile_ids()))
  with check (profile_id in (select public.user_profile_ids()));
