-- Allow 'weekly' as a subscription cadence (in addition to monthly/yearly).
-- For weekly cadence, charge_day represents the ISO weekday (1=Monday, 7=Sunday).

alter table public.subscriptions
  drop constraint if exists subscriptions_cadence_check;

alter table public.subscriptions
  add constraint subscriptions_cadence_check
  check (cadence in ('weekly', 'monthly', 'yearly'));
