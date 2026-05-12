-- Seed 6 default bank import rules for every existing profile that has the matching
-- categories + subcategories. Idempotent — won't duplicate if rerun.
--
-- The 6 default rules cover the most common merchants in Romania:
--   wolt/wolt food            → food-drinks > food-delivery
--   freshful/frsh             → food-drinks > online-groceries
--   carrefour/mega image      → food-drinks > groceries
--   digi/rds/telekom/orange/  → home-bills > internet-tv
--      vodafone
--   zooplus                   → pets > pet-food
--   emag/fashion days         → shopping > online-shopping
--   uber                      → transport-car > ride-sharing
--
-- New profiles get these seeded client-side from src/data/bankRules.seed.ts on the
-- first login (so the seed list stays in TypeScript alongside category/brand seeds).
-- This migration handles existing profiles (just you, for now) so you don't have to
-- add them manually from the UI.

insert into public.bank_import_rules (profile_id, keywords, category_id, subcategory_id, priority)
select
  p.id as profile_id,
  rule.keywords,
  cat.id as category_id,
  sub.id as subcategory_id,
  rule.priority
from public.profiles p
cross join lateral (
  values
    (array['wolt', 'wolt food'],                                'food-drinks',   'food-delivery',     10),
    (array['freshful', 'frsh'],                                 'food-drinks',   'online-groceries',  10),
    (array['carrefour', 'mega image'],                          'food-drinks',   'groceries',         10),
    (array['digi', 'rds', 'telekom', 'orange', 'vodafone'],     'home-bills',    'internet-tv',       10),
    (array['zooplus'],                                          'pets',          'pet-food',          10),
    (array['emag', 'fashion days'],                             'shopping',      'online-shopping',   10),
    (array['uber'],                                             'transport-car', 'ride-sharing',      10)
) as rule(keywords, cat_slug, sub_slug, priority)
join public.categories cat
  on cat.profile_id = p.id and cat.slug = rule.cat_slug
left join public.subcategories sub
  on sub.profile_id = p.id and sub.slug = rule.sub_slug
where not exists (
  select 1 from public.bank_import_rules r
  where r.profile_id = p.id and r.keywords = rule.keywords
);
