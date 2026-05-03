-- Allow budgets to be scoped to specific categories.
--
-- Empty array (default) = budget tracks ALL expenses in the period (current behavior).
-- Non-empty array = budget tracks only expenses whose category_id is in the list.
--
-- Use cases:
--   - "Buget vacanță" cu category_ids=[<id Vacanță>]
--   - "Buget mâncat în oraș" cu category_ids=[<id Food & Drinks>] (sumează și subcategoriile)
--   - "Buget cumpărături" cu category_ids=[<id Shopping>, <id Food & Drinks>]

alter table public.budgets
  add column if not exists category_ids uuid[] not null default '{}';

create index if not exists budgets_category_ids_idx
  on public.budgets using gin(category_ids);
