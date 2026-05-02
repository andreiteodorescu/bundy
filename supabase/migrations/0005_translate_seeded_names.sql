-- Translate the system-seeded category and subcategory names from English to Romanian.
-- Only updates rows where is_system = true so any user-renamed categories are preserved.
-- Brand rules continue to work because they reference slugs (which are unchanged).

-- ===== CATEGORIES =====
update public.categories set name = 'Mâncare & Băuturi'        where slug = 'food-drinks'    and is_system = true;
update public.categories set name = 'Transport & Mașină'       where slug = 'transport-car'  and is_system = true;
update public.categories set name = 'Casă & Facturi'           where slug = 'home-bills'     and is_system = true;
update public.categories set name = 'Cumpărături'              where slug = 'shopping'       and is_system = true;
update public.categories set name = 'Abonamente & Digital'     where slug = 'subs-digital'   and is_system = true;
update public.categories set name = 'Sănătate & Personal'      where slug = 'health-personal' and is_system = true;
update public.categories set name = 'Divertisment & Lifestyle' where slug = 'entertainment'  and is_system = true;
update public.categories set name = 'Muncă & Business'         where slug = 'work-business'  and is_system = true;
update public.categories set name = 'Finanțe'                  where slug = 'finance'        and is_system = true;
update public.categories set name = 'Cadouri'                  where slug = 'gifts'          and is_system = true;
update public.categories set name = 'Donații'                  where slug = 'donations'      and is_system = true;
update public.categories set name = 'Animale'                  where slug = 'pets'           and is_system = true;
update public.categories set name = 'Vacanță'                  where slug = 'vacation'       and is_system = true;
update public.categories set name = 'Diverse'                  where slug = 'misc'           and is_system = true;

-- ===== SUBCATEGORIES =====
update public.subcategories set name = 'Băcănie'              where slug = 'groceries'        and is_system = true;
update public.subcategories set name = 'În oraș'              where slug = 'eating-out'       and is_system = true;
update public.subcategories set name = 'Livrare mâncare'      where slug = 'food-delivery'    and is_system = true;
update public.subcategories set name = 'Băuturi'              where slug = 'drinks'           and is_system = true;
update public.subcategories set name = 'Mașină (combustibil)' where slug = 'car'              and is_system = true;
update public.subcategories set name = 'Parcare'              where slug = 'parking'          and is_system = true;
update public.subcategories set name = 'Transport public'     where slug = 'public-transport' and is_system = true;
update public.subcategories set name = 'Ride sharing'         where slug = 'ride-sharing'     and is_system = true;
update public.subcategories set name = 'Asigurări'            where slug = 'insurance'        and is_system = true;
update public.subcategories set name = 'Spălat mașină'        where slug = 'car-wash'         and is_system = true;
update public.subcategories set name = 'Chirie'               where slug = 'rent'             and is_system = true;
update public.subcategories set name = 'Curent'               where slug = 'electricity'      and is_system = true;
update public.subcategories set name = 'Gaze'                 where slug = 'gas'              and is_system = true;
update public.subcategories set name = 'Apă'                  where slug = 'water'            and is_system = true;
update public.subcategories set name = 'Internet / TV'        where slug = 'internet-tv'      and is_system = true;
update public.subcategories set name = 'Întreținere'          where slug = 'maintenance'      and is_system = true;
update public.subcategories set name = 'Reparații'            where slug = 'repairs'          and is_system = true;
update public.subcategories set name = 'Haine'                where slug = 'clothes'          and is_system = true;
update public.subcategories set name = 'Electronice'          where slug = 'electronics'      and is_system = true;
update public.subcategories set name = 'Articole casnice'     where slug = 'home-goods'       and is_system = true;
update public.subcategories set name = 'Mobilier'             where slug = 'furniture'        and is_system = true;
update public.subcategories set name = 'Cumpărături online'   where slug = 'online-shopping'  and is_system = true;
update public.subcategories set name = 'Software'             where slug = 'software'         and is_system = true;
update public.subcategories set name = 'Aplicații'            where slug = 'apps'             and is_system = true;
update public.subcategories set name = 'Farmacie'             where slug = 'pharmacy'         and is_system = true;
update public.subcategories set name = 'Medic'                where slug = 'doctor'           and is_system = true;
update public.subcategories set name = 'Dentist'              where slug = 'dentist'          and is_system = true;
update public.subcategories set name = 'Terapie'              where slug = 'therapy'          and is_system = true;
update public.subcategories set name = 'Sală / Fitness'       where slug = 'gym'              and is_system = true;
update public.subcategories set name = 'Îngrijire personală'  where slug = 'personal-care'    and is_system = true;
update public.subcategories set name = 'Filme / Cinema'       where slug = 'cinema'           and is_system = true;
update public.subcategories set name = 'Evenimente / Concerte' where slug = 'events'          and is_system = true;
update public.subcategories set name = 'Hobby-uri'            where slug = 'hobbies'          and is_system = true;
update public.subcategories set name = 'Călătorii / Vacanțe'  where slug = 'travel'           and is_system = true;
update public.subcategories set name = 'Mâncare & Accesorii'  where slug = 'pet-food'         and is_system = true;
update public.subcategories set name = 'Veterinar'            where slug = 'pet-vet'          and is_system = true;
update public.subcategories set name = 'Economii'             where slug = 'savings'          and is_system = true;
update public.subcategories set name = 'Investiții'           where slug = 'investments'      and is_system = true;
update public.subcategories set name = 'Taxe & Impozite'      where slug = 'taxes'            and is_system = true;
update public.subcategories set name = 'Credite'              where slug = 'loans'            and is_system = true;
update public.subcategories set name = 'Contabil'             where slug = 'accountant'       and is_system = true;
update public.subcategories set name = 'Software'             where slug = 'work-software'    and is_system = true;
update public.subcategories set name = 'Cursuri / Învățare'   where slug = 'courses'          and is_system = true;
