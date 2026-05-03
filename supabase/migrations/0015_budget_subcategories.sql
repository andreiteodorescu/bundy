-- Allow budgets to be scoped to specific subcategories (in addition to or instead of categories).
--
-- Filter logic:
--   - both empty: all expenses (default)
--   - only category_ids:    expense.category_id IN list
--   - only subcategory_ids: expense.subcategory_id IN list
--   - both:                 category_id IN cat_list OR subcategory_id IN sub_list (UNION)
--
-- Use case: "Buget mâncat în oraș" cu subcategory_ids=[<id În oraș>] — sumează DOAR
-- cheltuielile cu acea subcategorie, nu și Băcănie / Food Delivery / Băuturi.

alter table public.budgets
  add column if not exists subcategory_ids uuid[] not null default '{}';

create index if not exists budgets_subcategory_ids_idx
  on public.budgets using gin(subcategory_ids);
