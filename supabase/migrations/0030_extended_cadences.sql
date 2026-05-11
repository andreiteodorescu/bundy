-- Extend the set of recurrence cadences for subscriptions / recurring expenses.
-- Adds: daily, biweekly (every 2 weeks), quarterly (every 3 months),
--       semiannual (every 6 months).
-- Existing 'weekly' / 'monthly' / 'yearly' values stay valid.
--
-- Idempotent: drops the old constraint and re-adds with the full set.

alter table public.subscriptions
  drop constraint if exists subscriptions_cadence_check;

alter table public.subscriptions
  add constraint subscriptions_cadence_check
  check (cadence in (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'semiannual',
    'yearly'
  ));
