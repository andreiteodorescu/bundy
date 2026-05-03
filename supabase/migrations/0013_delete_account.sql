-- Allow a user to delete their own account from the app.
--
-- Calling delete_my_account():
--   1. Deletes profiles row(s) the user is member of → CASCADE deletes ALL associated data
--      (categories, subcategories, expenses, subscriptions, fixed_expenses, budgets,
--       budget_notifications, brand_rules, loans, quick_expenses, predefined_expenses,
--       and the profile_members rows themselves).
--   2. Deletes the auth.users row → user can no longer sign in with that email.
--
-- SECURITY: function is `security definer` and runs as the function owner (postgres role),
-- which has DELETE privileges on auth schema. Function callable only by authenticated users.
-- Each call deletes ONLY the calling user (auth.uid()), so a user cannot delete others.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- 1) Delete profile rows that this user owns (cascade removes all child data)
  delete from public.profiles
  where id in (
    select profile_id from public.profile_members where user_id = v_user
  );

  -- 2) Delete the auth user (revokes all sessions, prevents future sign-in)
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
