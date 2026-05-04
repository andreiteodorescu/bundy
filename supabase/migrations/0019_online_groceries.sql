-- Add the "Băcănie online" subcategory under Mâncare & Băuturi (slug: online-groceries),
-- and re-categorize existing Freshful expenses into it.
--
-- Idempotent: skips profiles that already have the subcategory.

-- Step 1: ensure every profile has the online-groceries subcategory
insert into public.subcategories (profile_id, parent_category_id, name, icon, sort_order, is_system, slug)
select
  p.id,
  c.id,
  'Băcănie online',
  'IconShoppingBag',
  2,
  true,
  'online-groceries'
from public.profiles p
join public.categories c
  on c.profile_id = p.id and c.slug = 'food-drinks'
where not exists (
  select 1 from public.subcategories s
  where s.profile_id = p.id and s.slug = 'online-groceries'
);

-- Step 2: re-categorize existing Freshful expenses to online-groceries
-- (case-insensitive match on name)
update public.expenses e set
  subcategory_id = sub.id
from public.subcategories sub
where sub.profile_id = e.profile_id
  and sub.slug = 'online-groceries'
  and e.category_id = (
    select c.id from public.categories c
    where c.profile_id = e.profile_id and c.slug = 'food-drinks'
  )
  and lower(e.name) like '%freshful%';
