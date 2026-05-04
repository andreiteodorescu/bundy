-- Split "Transport public" into three: metrou / autobuz / tren.
-- Strategy: rename the existing 'public-transport' row to 'public-transport-metro' so
-- expenses already linked stay valid, then insert two new siblings, then reassign
-- expenses by name heuristic (stb/autobuz → bus, cfr/tren → train).
-- Idempotent: re-runs safely (rename is no-op if already done; inserts skip on slug match).

-- 1. Rename existing slug + display name
update public.subcategories
set slug = 'public-transport-metro',
    name = 'Transport public - metrou'
where slug = 'public-transport';

-- 2. Add bus + train siblings under each profile's transport-car category
with target_profiles as (
  select p.id as profile_id, c.id as parent_category_id
  from public.profiles p
  join public.categories c on c.profile_id = p.id and c.slug = 'transport-car'
)
insert into public.subcategories (profile_id, parent_category_id, name, icon, sort_order, is_system, slug)
select tp.profile_id, tp.parent_category_id, x.name, x.icon, x.sort_order, true, x.slug
from target_profiles tp
cross join (values
  ('public-transport-bus',   'Transport public - autobuz', 'IconBus',   10),
  ('public-transport-train', 'Transport public - tren',    'IconTrain', 11)
) as x(slug, name, icon, sort_order)
where not exists (
  select 1 from public.subcategories s
  where s.profile_id = tp.profile_id and s.slug = x.slug
);

-- 3. Reassign existing expenses based on name heuristics
do $$
declare
  rec record;
  metro_id uuid;
  bus_id uuid;
  train_id uuid;
begin
  for rec in
    select distinct profile_id from public.subcategories where slug = 'public-transport-metro'
  loop
    select id into metro_id from public.subcategories where profile_id = rec.profile_id and slug = 'public-transport-metro';
    select id into bus_id   from public.subcategories where profile_id = rec.profile_id and slug = 'public-transport-bus';
    select id into train_id from public.subcategories where profile_id = rec.profile_id and slug = 'public-transport-train';

    if bus_id is not null then
      update public.expenses set subcategory_id = bus_id
      where subcategory_id = metro_id
        and (lower(name) like '%stb%' or lower(name) like '%autobuz%' or lower(name) like '%troleibuz%' or lower(name) like '%tramvai%');
    end if;

    if train_id is not null then
      update public.expenses set subcategory_id = train_id
      where subcategory_id = metro_id
        and (lower(name) like '%cfr%' or lower(name) like '%tren%');
    end if;
  end loop;
end$$;
