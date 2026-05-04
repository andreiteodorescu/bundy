-- Add the "Loterie" category and re-categorize existing lottery expenses to it.
--
-- Two cases handled:
--   1. User already manually created a category called "Loterie" (no slug):
--      → set its slug = 'lottery' so future brand_rules can target it.
--   2. User has no Loterie category:
--      → INSERT one with slug='lottery'.
--
-- Then UPDATE all expenses whose name matches lottery patterns (bilet loto, loto, loterie,
-- loz) to point to the Loterie category of their respective profile. Subcategory cleared.

-- Step 1: ensure every profile has a Loterie category with slug='lottery'.
-- For profiles with existing user-created "Loterie" (slug NULL), just set the slug.
update public.categories set slug = 'lottery'
where lower(name) = 'loterie' and (slug is null or slug != 'lottery');

-- For profiles with NO loterie category yet, insert one.
insert into public.categories (profile_id, name, color, icon, sort_order, is_system, slug)
select p.id, 'Loterie', '#a855f7', 'IconTicket', 16, true, 'lottery'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.profile_id = p.id and c.slug = 'lottery'
);

-- Step 2: re-categorize matching expenses to the profile's Loterie category.
-- Patterns: 'bilet loto', 'bilete loto', 'loto' (anywhere), 'loterie', 'loz'.
update public.expenses e set
  category_id = c.id,
  subcategory_id = null
from public.categories c
where c.profile_id = e.profile_id
  and c.slug = 'lottery'
  and (
    lower(e.name) like '%bilet loto%' or
    lower(e.name) like '%bilete loto%' or
    lower(e.name) like '%loterie%' or
    lower(e.name) like '%loz %' or
    lower(e.name) ~ '\mloto\M'   -- 'loto' as a whole word (not part of 'lotion' etc.)
  );
