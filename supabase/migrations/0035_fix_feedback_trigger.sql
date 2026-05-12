-- Fix: admin can't change feedback status because the
-- `feedback_notify_status_change` trigger tries to INSERT into
-- feedback_notifications (one row for the original author), but RLS blocks
-- the INSERT — the admin's auth.uid() doesn't match the notification's
-- profile_id (since notification goes to the *author* of the feedback,
-- not the admin doing the status change).
--
-- Trigger functions run as the calling user by default and DO honor RLS.
-- Fix: mark the trigger function as SECURITY DEFINER so it runs with the
-- privileges of the function owner (typically postgres superuser), which
-- bypasses RLS. Same pattern as is_admin() and bootstrap_profile().
--
-- Idempotent — `create or replace function`.

create or replace function feedback_notify_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into feedback_notifications (profile_id, feedback_id, old_status, new_status)
    values (new.profile_id, new.id, old.status, new.status);
  end if;
  return new;
end $$;

-- Trigger itself doesn't need to be recreated — it was already wired in 0029.

-- Same potential issue for the vote-counting trigger (admin upvoting another
-- user's feedback triggers UPDATE on feedback.votes_count which the admin can
-- do via RLS already, but we make it SECURITY DEFINER too for safety in case
-- vote logic gets extended later).
create or replace function feedback_recount_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target uuid;
begin
  target := coalesce(new.feedback_id, old.feedback_id);
  update feedback
    set votes_count = (select count(*) from feedback_votes where feedback_id = target)
    where id = target;
  return null;
end $$;
