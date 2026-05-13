-- Comments thread on each feedback entry. Authors + admins can edit/delete their
-- own; everyone signed in can read all and add new ones. Mirrors the public-board
-- model of `feedback` itself.
--
-- Also exposes a tiny RPC `feedback_author_names(uuid[])` that returns
-- {profile_id, name} pairs — needed because the `profiles` table's RLS hides
-- everyone but the caller's own profile, yet the feedback board is public.
-- The RPC is `security definer` to bypass RLS and intentionally exposes only
-- the display name (no email).
--
-- Idempotent.

create table if not exists feedback_comments (
  id           uuid primary key default gen_random_uuid(),
  feedback_id  uuid not null references feedback(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  body         text not null check (length(trim(body)) > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists feedback_comments_feedback_idx
  on feedback_comments (feedback_id, created_at);

create or replace function feedback_comments_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists feedback_comments_touch on feedback_comments;
create trigger feedback_comments_touch
  before update on feedback_comments
  for each row execute function feedback_comments_touch();

alter table feedback_comments enable row level security;

-- Ownership check uses profile_members so it works regardless of whether
-- profiles.id == auth.users.id (the existing feedback table relies on that
-- coincidence; we use the explicit join here to be safe).

drop policy if exists feedback_comments_select_all on feedback_comments;
create policy feedback_comments_select_all on feedback_comments for select using (true);

drop policy if exists feedback_comments_insert_own on feedback_comments;
create policy feedback_comments_insert_own on feedback_comments for insert
  with check (
    profile_id in (select profile_id from profile_members where user_id = auth.uid())
  );

drop policy if exists feedback_comments_update_own_or_admin on feedback_comments;
create policy feedback_comments_update_own_or_admin on feedback_comments for update
  using (
    profile_id in (select profile_id from profile_members where user_id = auth.uid())
    or is_admin()
  )
  with check (
    profile_id in (select profile_id from profile_members where user_id = auth.uid())
    or is_admin()
  );

drop policy if exists feedback_comments_delete_own_or_admin on feedback_comments;
create policy feedback_comments_delete_own_or_admin on feedback_comments for delete
  using (
    profile_id in (select profile_id from profile_members where user_id = auth.uid())
    or is_admin()
  );

-- Public author-name lookup. Returns name only — never email or any other PII.
create or replace function feedback_author_names(profile_ids uuid[])
returns table(profile_id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name from profiles where id = any(profile_ids);
$$;

grant execute on function feedback_author_names(uuid[]) to authenticated;
