-- Bundy initial schema. Multi-profile + RLS so multiple users (you + a friend) share the
-- same Supabase project but cannot see each other's data.
--
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- =========================
-- profiles & membership
-- =========================
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  base_currency   text not null default 'RON',
  locale          text not null default 'ro-RO',
  created_at      timestamptz not null default now()
);

create table if not exists public.profile_members (
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (user_id, profile_id)
);

create or replace function public.user_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select profile_id from public.profile_members where user_id = auth.uid();
$$;

-- =========================
-- categories & subcategories
-- =========================
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  color         text not null,
  icon          text not null,
  sort_order    int  not null default 0,
  is_system     boolean not null default false,
  slug          text,
  created_at    timestamptz not null default now(),
  unique (profile_id, name)
);
create index if not exists categories_profile_sort_idx
  on public.categories(profile_id, sort_order);

create table if not exists public.subcategories (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  parent_category_id  uuid not null references public.categories(id) on delete cascade,
  name                text not null,
  color               text,
  icon                text,
  sort_order          int  not null default 0,
  is_system           boolean not null default false,
  slug                text,
  created_at          timestamptz not null default now(),
  unique (profile_id, parent_category_id, name)
);
create index if not exists subcategories_profile_parent_idx
  on public.subcategories(profile_id, parent_category_id, sort_order);

-- =========================
-- expenses
-- =========================
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  name                text not null,
  amount_original     numeric(12,2) not null,
  currency_original   text not null default 'RON',
  amount_ron          numeric(12,2) not null,
  fx_rate             numeric(12,6),
  fx_rate_date        date,
  occurred_on         date not null,
  category_id         uuid references public.categories(id) on delete set null,
  subcategory_id      uuid references public.subcategories(id) on delete set null,
  note                text,
  tags                text[] not null default '{}',
  source              text not null default 'manual' check (source in ('manual','subscription','fixed')),
  source_ref_id       uuid,
  recurrence          jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists expenses_profile_date_idx on public.expenses(profile_id, occurred_on desc);
create index if not exists expenses_profile_cat_date_idx on public.expenses(profile_id, category_id, occurred_on);
create index if not exists expenses_profile_source_idx on public.expenses(profile_id, source, source_ref_id);
create index if not exists expenses_tags_gin_idx on public.expenses using gin (tags);

-- Idempotency for subscription auto-create
create unique index if not exists expenses_subscription_unique_idx
  on public.expenses(profile_id, source_ref_id, occurred_on)
  where source = 'subscription';

create or replace function public.expenses_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.expenses_set_updated_at();

-- =========================
-- subscriptions, fixed expenses
-- =========================
create table if not exists public.subscriptions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  amount          numeric(12,2) not null,
  currency        text not null,
  cadence         text not null check (cadence in ('monthly','yearly')),
  charge_day      int  not null check (charge_day between 1 and 31),
  charge_month    int  check (charge_month between 1 and 12),
  category_id     uuid references public.categories(id) on delete set null,
  subcategory_id  uuid references public.subcategories(id) on delete set null,
  tags            text[] not null default '{}',
  active          boolean not null default true,
  paused_until    date,
  start_date      date not null default current_date,
  end_date        date,
  created_at      timestamptz not null default now()
);
create index if not exists subscriptions_profile_active_idx on public.subscriptions(profile_id, active);

create table if not exists public.fixed_expenses (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  amount          numeric(12,2) not null,
  currency        text not null default 'RON',
  category_id     uuid references public.categories(id) on delete set null,
  subcategory_id  uuid references public.subcategories(id) on delete set null,
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists fixed_profile_sort_idx on public.fixed_expenses(profile_id, sort_order);

-- =========================
-- budgets & notification tracking
-- =========================
create table if not exists public.budgets (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  amount_ron      numeric(12,2) not null,
  currency        text not null default 'RON',
  period_kind     text not null check (period_kind in ('days','month','year','months_forward')),
  period_start    date not null,
  period_end      date not null,
  selected_days   date[],
  thresholds_pct  int[] not null default '{50,75,90,100}',
  created_at      timestamptz not null default now()
);
create index if not exists budgets_profile_period_idx on public.budgets(profile_id, period_start, period_end);

create table if not exists public.budget_notifications (
  budget_id      uuid not null references public.budgets(id) on delete cascade,
  threshold_pct  int  not null,
  fired_at       timestamptz not null default now(),
  primary key (budget_id, threshold_pct)
);

-- =========================
-- BNR FX cache
-- =========================
create table if not exists public.fx_rates (
  date          date not null,
  currency      text not null,
  rate_to_ron   numeric(12,6) not null,
  primary key (date, currency)
);

-- =========================
-- brand rules (autocomplete)
-- =========================
create table if not exists public.brand_rules (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete cascade, -- null = global seeded rule
  pattern         text not null,
  match_kind      text not null default 'contains' check (match_kind in ('contains','starts_with','regex')),
  category_id     uuid references public.categories(id) on delete cascade,
  subcategory_id  uuid references public.subcategories(id) on delete cascade,
  priority        int  not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists brand_rules_profile_priority_idx
  on public.brand_rules(profile_id nulls first, priority desc);

-- =========================
-- Row-Level Security
-- =========================
alter table public.profiles               enable row level security;
alter table public.profile_members        enable row level security;
alter table public.categories             enable row level security;
alter table public.subcategories          enable row level security;
alter table public.expenses               enable row level security;
alter table public.subscriptions          enable row level security;
alter table public.fixed_expenses         enable row level security;
alter table public.budgets                enable row level security;
alter table public.budget_notifications   enable row level security;
alter table public.brand_rules            enable row level security;
alter table public.fx_rates               enable row level security;

-- profiles: members can read; only the user themselves can update name/locale via app code
create policy "members read profiles"
  on public.profiles for select
  using (id in (select public.user_profile_ids()));

create policy "members update profiles"
  on public.profiles for update
  using (id in (select public.user_profile_ids()));

-- profile_members: a user sees only their own rows
create policy "self read memberships"
  on public.profile_members for select
  using (user_id = auth.uid());

-- Helper macro: a single template policy per profile-scoped table
do $$
declare
  t text;
  tables text[] := array[
    'categories','subcategories','expenses','subscriptions',
    'fixed_expenses','budgets','brand_rules'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "members all %1$I" on public.%1$I', t);
    execute format($f$
      create policy "members all %1$I" on public.%1$I
      for all
      using (profile_id in (select public.user_profile_ids()))
      with check (profile_id in (select public.user_profile_ids()))
    $f$, t);
  end loop;
end$$;

-- brand_rules: also readable when profile_id is null (global seeded rules)
create policy "global brand rules readable"
  on public.brand_rules for select
  using (profile_id is null);

-- budget_notifications: scoped via budgets join
create policy "members budget notifications"
  on public.budget_notifications for all
  using (budget_id in (select id from public.budgets where profile_id in (select public.user_profile_ids())))
  with check (budget_id in (select id from public.budgets where profile_id in (select public.user_profile_ids())));

-- fx_rates: globally readable (cache shared across all users)
create policy "fx_rates readable"
  on public.fx_rates for select
  using (true);
-- Writes happen only via service role (api/fx.ts) which bypasses RLS.
