-- Fix bug in 0029_feedback.sql: RLS policies compared `profile_id = auth.uid()`,
-- which is wrong. `auth.uid()` returns the Supabase auth `user_id` (from auth.users),
-- NOT the `profile_id` from public.profiles — they're separate UUIDs joined via
-- `profile_members(user_id, profile_id)`. The original policies could only succeed
-- by coincidence (random UUID collision), so any new signup gets "couldn't save"
-- when trying to submit feedback or vote.
--
-- Fix: switch to the standard pattern used everywhere else in the schema:
--
--   profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
--
-- Idempotent — drops & recreates the same-named policies.

-- ─── feedback ────────────────────────────────────────────────────────────────────

drop policy if exists feedback_insert_own on feedback;
create policy feedback_insert_own on feedback for insert
  with check (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  );

drop policy if exists feedback_update_own_or_admin on feedback;
create policy feedback_update_own_or_admin on feedback for update
  using (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
    or is_admin()
  )
  with check (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
    or is_admin()
  );

drop policy if exists feedback_delete_own_or_admin on feedback;
create policy feedback_delete_own_or_admin on feedback for delete
  using (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
    or is_admin()
  );

-- ─── feedback_votes ──────────────────────────────────────────────────────────────

drop policy if exists feedback_votes_write_own on feedback_votes;
create policy feedback_votes_write_own on feedback_votes for insert
  with check (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  );

drop policy if exists feedback_votes_delete_own on feedback_votes;
create policy feedback_votes_delete_own on feedback_votes for delete
  using (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  );

-- ─── feedback_notifications ──────────────────────────────────────────────────────

drop policy if exists feedback_notifications_select_own on feedback_notifications;
create policy feedback_notifications_select_own on feedback_notifications for select
  using (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  );

drop policy if exists feedback_notifications_update_own on feedback_notifications;
create policy feedback_notifications_update_own on feedback_notifications for update
  using (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  )
  with check (
    profile_id in (select profile_id from public.profile_members where user_id = auth.uid())
  );
