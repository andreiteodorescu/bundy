-- Add INSERT policies needed for first-login profile bootstrap.
-- The original 0001_init.sql defined SELECT/UPDATE on profiles and SELECT on profile_members,
-- but `ensureProfile()` needs to INSERT a new profile + membership row at first sign-in.
--
-- Safety: an authenticated user can only insert a membership for themselves
-- (user_id = auth.uid()), and they can insert a profile but won't see it until they
-- add themselves as a member.

-- profiles: any authenticated user can create a new profile
drop policy if exists "authenticated can insert profiles" on public.profiles;
create policy "authenticated can insert profiles"
  on public.profiles for insert
  with check (auth.uid() is not null);

-- profile_members: a user can only insert membership rows for themselves
drop policy if exists "self insert membership" on public.profile_members;
create policy "self insert membership"
  on public.profile_members for insert
  with check (user_id = auth.uid());

-- Optional: allow a user to delete their own membership (e.g. leaving a shared profile)
drop policy if exists "self delete membership" on public.profile_members;
create policy "self delete membership"
  on public.profile_members for delete
  using (user_id = auth.uid());
