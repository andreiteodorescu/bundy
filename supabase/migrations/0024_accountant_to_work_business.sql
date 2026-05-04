-- Move "Contabil" (slug 'accountant') from category Finanțe to Munca & Business,
-- and add a new "Taxe & Impozite" subcategory (slug 'work-taxes') under Munca & Business
-- for business-related taxes (separate from personal Finance > Taxe & Impozite).
--
-- Idempotent: re-runs are safe.

-- 1. Reparent existing accountant subcategory to work-business
update public.subcategories s
set parent_category_id = wb.id,
    sort_order = 3
from public.categories wb
where wb.profile_id = s.profile_id
  and wb.slug = 'work-business'
  and s.slug = 'accountant';

-- 2. Insert work-taxes subcategory under each profile's work-business category
with target_profiles as (
  select p.id as profile_id, c.id as parent_category_id
  from public.profiles p
  join public.categories c on c.profile_id = p.id and c.slug = 'work-business'
)
insert into public.subcategories (profile_id, parent_category_id, name, icon, sort_order, is_system, slug)
select tp.profile_id, tp.parent_category_id, 'Taxe & Impozite', 'IconReceiptTax', 4, true, 'work-taxes'
from target_profiles tp
where not exists (
  select 1 from public.subcategories s
  where s.profile_id = tp.profile_id and s.slug = 'work-taxes'
);
