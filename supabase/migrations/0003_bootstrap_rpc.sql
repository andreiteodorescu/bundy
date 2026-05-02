-- Replace the direct-insert bootstrap (which required tricky RLS policies on profiles +
-- profile_members) with a single SECURITY DEFINER function that atomically creates the
-- profile and membership. The function bypasses RLS by design, but only inserts a row
-- whose user_id = auth.uid(), so it's safe.

create or replace function public.bootstrap_profile(profile_name text)
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

  -- Idempotent: if user is already a member of any profile, return the first one
  select profile_id into v_profile_id
  from public.profile_members
  where user_id = v_user
  limit 1;

  if v_profile_id is not null then
    return v_profile_id;
  end if;

  insert into public.profiles(name)
  values (coalesce(nullif(trim(profile_name), ''), 'Profil'))
  returning id into v_profile_id;

  insert into public.profile_members(user_id, profile_id, role)
  values (v_user, v_profile_id, 'owner');

  return v_profile_id;
end;
$$;

revoke all on function public.bootstrap_profile(text) from public;
grant execute on function public.bootstrap_profile(text) to authenticated;
