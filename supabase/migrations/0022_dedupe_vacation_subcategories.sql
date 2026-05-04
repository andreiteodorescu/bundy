-- Cleanup: when 0021 ran, manually-created vacation subcategories with slightly
-- different spellings (e.g. "Închiriere mașinã" with tilde vs "mașină" with breve)
-- did not match by name, so a second slugged row was inserted alongside.
-- For each (profile, parent=vacation, target slug), if there is a duplicate row
-- without a slug, reassign expenses to the slugged row and delete the unslugged one.

do $$
declare
  rec record;
begin
  for rec in
    select s_dup.id as dup_id, s_keep.id as keep_id
    from public.subcategories s_dup
    join public.categories c
      on c.id = s_dup.parent_category_id
     and c.slug = 'vacation'
    join public.subcategories s_keep
      on s_keep.profile_id = s_dup.profile_id
     and s_keep.parent_category_id = s_dup.parent_category_id
     and s_keep.slug in (
       'vacation-flights','vacation-airbnb','vacation-hotel',
       'vacation-misc','vacation-car-rental','vacation-airport-transport'
     )
    where s_dup.slug is null
      and s_dup.id <> s_keep.id
      and lower(translate(s_dup.name, 'ăâîșțĂÂÎȘȚãÃ', 'aaistaaistaA')) =
          lower(translate(s_keep.name, 'ăâîșțĂÂÎȘȚãÃ', 'aaistaaistaA'))
  loop
    update public.expenses set subcategory_id = rec.keep_id where subcategory_id = rec.dup_id;
    update public.subscriptions set subcategory_id = rec.keep_id where subcategory_id = rec.dup_id;
    delete from public.subcategories where id = rec.dup_id;
  end loop;
end$$;
