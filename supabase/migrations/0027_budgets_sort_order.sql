-- Adaugă sort_order pe budgets pentru ordonare manuală în lista Active + carouselul
-- ActiveBudgetBanner (Home, ExpensesListPage). Default 0 — bugetele existente rămân
-- ordonate fallback după period_start DESC până când userul le rearanjează.
-- Idempotent: re-rulabil safe.

alter table public.budgets
  add column if not exists sort_order int not null default 0;

create index if not exists budgets_profile_sort_idx
  on public.budgets(profile_id, sort_order);
