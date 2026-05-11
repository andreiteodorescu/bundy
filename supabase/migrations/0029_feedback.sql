-- Public feedback / feature request board.
--   - All users can see all entries (transparency, dedup)
--   - Authors can edit/delete their own
--   - Admins can change status
--   - In-app notifications fire when an entry's status changes (no email)
--
-- Idempotent: safe to re-run.

create table if not exists feedback (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  type          text not null check (type in ('bug', 'feature')),
  title         text not null check (length(trim(title)) > 0),
  body          text,
  status        text not null,
  votes_count   integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists feedback_type_status_idx on feedback (type, status);
create index if not exists feedback_created_at_idx on feedback (created_at desc);

create table if not exists feedback_votes (
  feedback_id  uuid not null references feedback(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (feedback_id, profile_id)
);

-- In-app notification queue. One row per user per status change so unread badge counts work.
create table if not exists feedback_notifications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  feedback_id  uuid not null references feedback(id) on delete cascade,
  old_status   text,
  new_status   text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists feedback_notifications_unread_idx
  on feedback_notifications (profile_id, read_at)
  where read_at is null;

-- Triggers ----------------------------------------------------------------------

create or replace function feedback_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists feedback_touch on feedback;
create trigger feedback_touch
  before update on feedback
  for each row execute function feedback_touch_updated_at();

create or replace function feedback_recount_votes() returns trigger language plpgsql as $$
declare target uuid;
begin
  target := coalesce(new.feedback_id, old.feedback_id);
  update feedback
    set votes_count = (select count(*) from feedback_votes where feedback_id = target)
    where id = target;
  return null;
end $$;

drop trigger if exists feedback_votes_recount on feedback_votes;
create trigger feedback_votes_recount
  after insert or delete on feedback_votes
  for each row execute function feedback_recount_votes();

create or replace function feedback_notify_status_change() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into feedback_notifications (profile_id, feedback_id, old_status, new_status)
    values (new.profile_id, new.id, old.status, new.status);
  end if;
  return new;
end $$;

drop trigger if exists feedback_status_change on feedback;
create trigger feedback_status_change
  after update on feedback
  for each row execute function feedback_notify_status_change();

-- RLS ---------------------------------------------------------------------------

alter table feedback              enable row level security;
alter table feedback_votes        enable row level security;
alter table feedback_notifications enable row level security;

-- Note: `is_admin()` helper is already defined in 0017_admin.sql (checks
-- profile_members.is_admin for the calling user). We reuse it here.

drop policy if exists feedback_select_all on feedback;
create policy feedback_select_all on feedback for select using (true);

drop policy if exists feedback_insert_own on feedback;
create policy feedback_insert_own on feedback for insert with check (profile_id = auth.uid());

-- Authors can edit their own (title/body), admins can edit anything (incl. status).
drop policy if exists feedback_update_own_or_admin on feedback;
create policy feedback_update_own_or_admin on feedback for update
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid() or is_admin());

drop policy if exists feedback_delete_own_or_admin on feedback;
create policy feedback_delete_own_or_admin on feedback for delete
  using (profile_id = auth.uid() or is_admin());

drop policy if exists feedback_votes_select_all on feedback_votes;
create policy feedback_votes_select_all on feedback_votes for select using (true);

drop policy if exists feedback_votes_write_own on feedback_votes;
create policy feedback_votes_write_own on feedback_votes for insert
  with check (profile_id = auth.uid());

drop policy if exists feedback_votes_delete_own on feedback_votes;
create policy feedback_votes_delete_own on feedback_votes for delete
  using (profile_id = auth.uid());

drop policy if exists feedback_notifications_select_own on feedback_notifications;
create policy feedback_notifications_select_own on feedback_notifications for select
  using (profile_id = auth.uid());

drop policy if exists feedback_notifications_update_own on feedback_notifications;
create policy feedback_notifications_update_own on feedback_notifications for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
