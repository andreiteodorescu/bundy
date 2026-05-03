-- Add the "Datorie" category to all existing profiles. Folosit pentru bani împrumutați
-- de la cunoștințe (informal, NU credite bancare — alea sunt în "Rate" / loans).
-- Idempotent prin slug.

insert into public.categories (profile_id, name, color, icon, sort_order, is_system, slug)
select p.id, 'Datorie', '#ef4444', 'IconUsers', 15, true, 'debt'
from public.profiles p
where not exists (
  select 1 from public.categories c
  where c.profile_id = p.id and c.slug = 'debt'
);
