-- Add the "Adopție" category to all existing profiles. Idempotent: skips profiles
-- that already have a category with slug='adoption' (so safe to re-run).
--
-- Profiluri noi create de aici încolo o vor primi prin bootstrap (vezi
-- src/data/categories.seed.ts).

insert into public.categories (profile_id, name, color, icon, sort_order, is_system, slug)
select p.id, 'Adopție', '#f59e0b', 'IconBabyCarriage', 14, true, 'adoption'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.profile_id = p.id and c.slug = 'adoption'
);
