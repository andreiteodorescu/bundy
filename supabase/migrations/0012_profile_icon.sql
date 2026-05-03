-- Add icon column to profiles (animal avatar) + update bootstrap_profile RPC to accept it.
-- Profile icon is a string referencing the iconRegistry in src/data/icons.registry.ts
-- (e.g. 'IconCat', 'IconDog'). The animal-icons subset is curated in src/data/animalIcons.ts.

alter table public.profiles
  add column if not exists icon text not null default 'IconUser';

-- Recreate bootstrap_profile to accept an optional icon param. Backwards compatible:
-- existing callers that pass only profile_name still work.
create or replace function public.bootstrap_profile(profile_name text, profile_icon text default 'IconUser')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select profile_id into v_profile_id
  from public.profile_members
  where user_id = v_user
  limit 1;

  if v_profile_id is not null then
    return v_profile_id;
  end if;

  insert into public.profiles(name, icon)
  values (
    coalesce(nullif(trim(profile_name), ''), 'Profil'),
    coalesce(nullif(trim(profile_icon), ''), 'IconUser')
  )
  returning id into v_profile_id;

  insert into public.profile_members(user_id, profile_id, role)
  values (v_user, v_profile_id, 'owner');

  return v_profile_id;
end;
$$;

revoke all on function public.bootstrap_profile(text, text) from public;
grant execute on function public.bootstrap_profile(text, text) to authenticated;
