-- Introduce a "company-card" tag system for expenses paid with the company card
-- (vs personal money). Renames the legacy `work-reimbursable` tag (used informally
-- for Claude Max / similar) to the new `company-card` semantics, and adds a `tags`
-- column to template tables so the tag propagates from template → generated expense.
--
-- Idempotent: re-runs safely.

-- 1. Rename work-reimbursable → company-card in existing tag arrays
update public.expenses
set tags = array(
  select case when t = 'work-reimbursable' then 'company-card' else t end
  from unnest(tags) t
)
where 'work-reimbursable' = any(tags);

update public.subscriptions
set tags = array(
  select case when t = 'work-reimbursable' then 'company-card' else t end
  from unnest(tags) t
)
where 'work-reimbursable' = any(tags);

-- 2. Add tags column to template tables (so a "company-card" template flag flows
--    through to expense rows generated from it: fixed quick-add, predefined pre-fill,
--    subscription generator, loan generator).
alter table public.fixed_expenses      add column if not exists tags text[] not null default '{}';
alter table public.quick_expenses      add column if not exists tags text[] not null default '{}';
alter table public.predefined_expenses add column if not exists tags text[] not null default '{}';
alter table public.loans               add column if not exists tags text[] not null default '{}';
