-- Add 6 subcategories under "Vacante" (slug: vacation) for existing profiles.
-- Idempotent: backfills slug/icon/sort_order on rows already created manually,
-- inserts the rest.

with target as (
  select p.id as profile_id, c.id as parent_category_id, x.slug, x.name, x.icon, x.sort_order
  from public.profiles p
  join public.categories c on c.profile_id = p.id and c.slug = 'vacation'
  cross join (values
    ('vacation-flights',           'Bilete avion',         'IconPlaneTilt',         1),
    ('vacation-airbnb',            'Cazare Airbnb',        'IconHome',              2),
    ('vacation-hotel',             'Cazare hotel',         'IconBuildingCommunity', 3),
    ('vacation-misc',              'Cheltuieli generale',  'IconReceipt',           4),
    ('vacation-car-rental',        'Închiriere mașină',    'IconCar',               5),
    ('vacation-airport-transport', 'Transport aeroport',   'IconBusStop',           6)
  ) as x(slug, name, icon, sort_order)
),
updated as (
  update public.subcategories s
  set slug = t.slug,
      icon = coalesce(s.icon, t.icon),
      sort_order = case when s.sort_order is null or s.sort_order = 0 then t.sort_order else s.sort_order end,
      is_system = true
  from target t
  where s.profile_id = t.profile_id
    and s.parent_category_id = t.parent_category_id
    and s.name = t.name
  returning s.profile_id, s.parent_category_id, s.name
)
insert into public.subcategories (profile_id, parent_category_id, name, icon, sort_order, is_system, slug)
select t.profile_id, t.parent_category_id, t.name, t.icon, t.sort_order, true, t.slug
from target t
where not exists (
  select 1 from updated u
  where u.profile_id = t.profile_id
    and u.parent_category_id = t.parent_category_id
    and u.name = t.name
)
and not exists (
  select 1 from public.subcategories s
  where s.profile_id = t.profile_id and s.slug = t.slug
);
