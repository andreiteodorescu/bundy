-- Master/admin role for managing users from inside the app.
--
-- Add `is_admin` flag on profile_members. Set it manually for the master account:
--   UPDATE profile_members SET is_admin = true
--   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'andrei.teodorescu83@gmail.com');
--
-- All admin RPCs are SECURITY DEFINER and verify the caller is admin (auth.uid() check).
-- Each admin action logs to admin_actions for audit.
--
-- SAFETY: admins can ban/delete any user EXCEPT themselves (prevents lockout / accidental
-- self-delete via wrong UI button — they have Settings → Delete Account for that).

alter table public.profile_members
  add column if not exists is_admin boolean not null default false;

create index if not exists profile_members_admin_idx
  on public.profile_members(is_admin) where is_admin = true;

-- ===== Audit log =====
create table if not exists public.admin_actions (
  id           uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete set null,
  target_user_id uuid,
  target_email text,
  action       text not null,        -- 'ban' | 'unban' | 'delete'
  created_at   timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions(created_at desc);

alter table public.admin_actions enable row level security;
drop policy if exists "admins read admin_actions" on public.admin_actions;
create policy "admins read admin_actions"
  on public.admin_actions for select
  using (exists (
    select 1 from public.profile_members
    where user_id = auth.uid() and is_admin = true
  ));
-- writes are done only via SECURITY DEFINER functions (no direct policy needed)

-- ===== Helper to check admin =====
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profile_members
    where user_id = auth.uid() and is_admin = true
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- ===== List all users (admin-only) =====
create or replace function public.admin_list_users()
returns table(
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  user_created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  profile_id uuid,
  profile_name text,
  profile_icon text,
  is_admin_flag boolean,
  expense_count bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id::uuid,
    u.email::text,
    u.email_confirmed_at::timestamptz,
    u.created_at::timestamptz,
    u.last_sign_in_at::timestamptz,
    u.banned_until::timestamptz,
    p.id::uuid,
    p.name::text,
    p.icon::text,
    coalesce(pm.is_admin, false),
    coalesce((select count(*) from public.expenses e where e.profile_id = p.id), 0)
  from auth.users u
  left join public.profile_members pm on pm.user_id = u.id
  left join public.profiles p on p.id = pm.profile_id
  order by u.created_at desc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- ===== Ban/Unban a user =====
create or replace function public.admin_ban_user(target_user_id uuid, ban boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot ban yourself';
  end if;

  select email into v_email from auth.users where id = target_user_id;

  if ban then
    update auth.users set banned_until = 'infinity'::timestamptz
    where id = target_user_id;
  else
    update auth.users set banned_until = null
    where id = target_user_id;
  end if;

  insert into public.admin_actions(admin_user_id, target_user_id, target_email, action)
  values (auth.uid(), target_user_id, v_email, case when ban then 'ban' else 'unban' end);
end;
$$;
revoke all on function public.admin_ban_user(uuid, boolean) from public;
grant execute on function public.admin_ban_user(uuid, boolean) to authenticated;

-- ===== Delete a user + all their data =====
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Use Settings → Delete Account for your own account';
  end if;

  select email into v_email from auth.users where id = target_user_id;

  -- Cascade: delete profiles → all child rows go too
  delete from public.profiles
  where id in (
    select profile_id from public.profile_members where user_id = target_user_id
  );

  delete from auth.users where id = target_user_id;

  insert into public.admin_actions(admin_user_id, target_user_id, target_email, action)
  values (auth.uid(), target_user_id, v_email, 'delete');
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
