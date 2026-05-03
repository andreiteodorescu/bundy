-- Re-categorize historical expenses whose names contain Romanian diacritics
-- and were therefore not matched by the brand rules at seed time. Going forward,
-- the brand-rule matcher in src/lib/autocomplete.ts normalizes diacritics so this
-- type of mismatch won't happen again.
--
-- Idempotent: if these expenses are already correctly categorized (e.g. user
-- fixed them manually), the inner subquery returns the same id and nothing changes.

-- Spălat mașină → Transport & Mașină > Spălat mașină
update public.expenses e set
  category_id    = (select id from public.categories     where slug = 'transport-car' and profile_id = e.profile_id),
  subcategory_id = (select id from public.subcategories  where slug = 'car-wash'      and profile_id = e.profile_id)
where lower(e.name) like '%spălat mașin%' or lower(e.name) like '%spalat masin%';

-- Întreținere (lunile asociației) → Casă & Facturi > Întreținere
update public.expenses e set
  category_id    = (select id from public.categories     where slug = 'home-bills'  and profile_id = e.profile_id),
  subcategory_id = (select id from public.subcategories  where slug = 'maintenance' and profile_id = e.profile_id)
where (lower(e.name) like 'întreținere %' or lower(e.name) like 'intretinere %')
  and lower(e.name) not like '%mașin%';

-- Mâncare pisici → Animale > Mâncare & Accesorii
update public.expenses e set
  category_id    = (select id from public.categories     where slug = 'pets'     and profile_id = e.profile_id),
  subcategory_id = (select id from public.subcategories  where slug = 'pet-food' and profile_id = e.profile_id)
where lower(e.name) like '%mâncare pisici%' or lower(e.name) like '%mancare pisici%';

-- Reincărcare cartelă (telefon) → Casă & Facturi > Internet/TV
update public.expenses e set
  category_id    = (select id from public.categories     where slug = 'home-bills'   and profile_id = e.profile_id),
  subcategory_id = (select id from public.subcategories  where slug = 'internet-tv'  and profile_id = e.profile_id)
where (lower(e.name) like '%reincărcare cartelă%' or lower(e.name) like '%reincarcare cartela%');

-- Înghețată Bolt → Mâncare & Băuturi > Băuturi (drinks bucket — sweet treats)
-- (Hint-ul din historical-data deja l-a categorizat OK, dar ce-i drept dacă vreun user
--  a inserat manual fără hint, rezolvăm și aici.)
update public.expenses e set
  category_id    = (select id from public.categories     where slug = 'food-drinks' and profile_id = e.profile_id),
  subcategory_id = (select id from public.subcategories  where slug = 'drinks'      and profile_id = e.profile_id)
where lower(e.name) like '%înghețată bolt%' or lower(e.name) like '%inghetata bolt%';
