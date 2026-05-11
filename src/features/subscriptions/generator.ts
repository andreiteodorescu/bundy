import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { getFxRate } from '@/lib/fx';
import { round2 } from '@/lib/money';
import type { Subscription } from '@/types';

const FLAG_KEY = 'bundy.subscriptions.lastRun';

/**
 * Materialize subscription expenses for any charge dates between (today - 30 days) and today
 * that haven't been recorded yet. Idempotent — checks for existing rows before insert.
 *
 * Runs on app boot, gated by a date flag in localStorage so we don't re-run within the same day.
 */
export async function runSubscriptionGenerator(profileId: string): Promise<{ created: number }> {
  const today = dayjs().format('YYYY-MM-DD');
  if (typeof window !== 'undefined' && window.localStorage.getItem(FLAG_KEY) === today) {
    return { created: 0 };
  }

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('active', true);
  if (error) throw error;

  let created = 0;
  for (const sub of (subs ?? []) as Subscription[]) {
    const dates = chargeDatesInWindow(sub, dayjs().subtract(30, 'day'), dayjs());
    for (const date of dates) {
      const existing = await supabase
        .from('expenses')
        .select('id')
        .eq('profile_id', profileId)
        .eq('source', 'subscription')
        .eq('source_ref_id', sub.id)
        .eq('occurred_on', date)
        .maybeSingle();
      if (existing.data) continue;

      let amountRon = sub.amount;
      let fxRate: number | null = null;
      let fxRateDate: string | null = null;
      if (sub.currency !== 'RON') {
        try {
          const rate = await getFxRate(date, sub.currency);
          amountRon = round2(sub.amount * rate.rate_to_ron);
          fxRate = rate.rate_to_ron;
          fxRateDate = rate.date;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`[bundy] FX fetch failed for ${sub.name} on ${date}; skipping`, err);
          continue;
        }
      }

      const { error: insertErr } = await supabase.from('expenses').insert({
        profile_id: profileId,
        name: sub.name,
        amount_original: sub.amount,
        currency_original: sub.currency,
        amount_ron: amountRon,
        fx_rate: fxRate,
        fx_rate_date: fxRateDate,
        occurred_on: date,
        category_id: sub.category_id,
        subcategory_id: sub.subcategory_id,
        tags: sub.tags,
        source: 'subscription',
        source_ref_id: sub.id,
        note: null,
      });
      if (!insertErr) created++;
    }
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(FLAG_KEY, today);
  }
  return { created };
}

/**
 * Compute the actual charge dates for a subscription within a date window.
 *
 * Cadences:
 * - **daily**:      every day from start_date. charge_day ignored.
 * - **weekly**:     charge_day = ISO weekday (1=Mon..7=Sun). Day-by-day scan.
 * - **biweekly**:   every 14 days, anchored on the first matching weekday
 *                   (charge_day = ISO weekday) on or after start_date.
 * - **monthly**:    charge_day = day-of-month (1..31). Clamps to month end
 *                   (day=31 in February becomes 28/29).
 * - **quarterly**:  every 3 months, same charge_day, anchored on start_date's month.
 * - **semiannual**: every 6 months, same charge_day, anchored on start_date's month.
 * - **yearly**:     charge_day + charge_month define the annual date.
 */
export function chargeDatesInWindow(
  sub: Subscription,
  windowStart: dayjs.Dayjs,
  windowEnd: dayjs.Dayjs,
): string[] {
  const dates: string[] = [];
  const subStart = dayjs(sub.start_date);
  const effectiveStart = subStart.isAfter(windowStart) ? subStart : windowStart;
  const subEnd = sub.end_date ? dayjs(sub.end_date) : null;
  const effectiveEnd = subEnd && subEnd.isBefore(windowEnd) ? subEnd : windowEnd;

  // ---- Day-grain cadences ----

  if (sub.cadence === 'daily') {
    let cursor = effectiveStart.startOf('day');
    while (cursor.isBefore(effectiveEnd) || cursor.isSame(effectiveEnd, 'day')) {
      dates.push(cursor.format('YYYY-MM-DD'));
      cursor = cursor.add(1, 'day');
    }
    return dates;
  }

  if (sub.cadence === 'weekly') {
    let cursor = effectiveStart.startOf('day');
    while (cursor.isBefore(effectiveEnd) || cursor.isSame(effectiveEnd, 'day')) {
      if (cursor.isoWeekday() === sub.charge_day) {
        dates.push(cursor.format('YYYY-MM-DD'));
      }
      cursor = cursor.add(1, 'day');
    }
    return dates;
  }

  if (sub.cadence === 'biweekly') {
    // First charge: the first occurrence of charge_day weekday on/after subStart.
    // Subsequent charges: every 14 days from that anchor.
    let firstCharge = subStart.startOf('day');
    while (firstCharge.isoWeekday() !== sub.charge_day) {
      firstCharge = firstCharge.add(1, 'day');
    }
    let cursor = firstCharge;
    while (cursor.isBefore(effectiveEnd) || cursor.isSame(effectiveEnd, 'day')) {
      if (cursor.isSame(effectiveStart, 'day') || cursor.isAfter(effectiveStart, 'day')) {
        dates.push(cursor.format('YYYY-MM-DD'));
      }
      cursor = cursor.add(14, 'day');
    }
    return dates;
  }

  // ---- Month-grain cadences (monthly, quarterly, semiannual, yearly) ----

  // monthStep: how many months between charges.
  // quarterly = 3, semiannual = 6, yearly = 12, monthly = 1.
  const monthStep =
    sub.cadence === 'quarterly'
      ? 3
      : sub.cadence === 'semiannual'
        ? 6
        : sub.cadence === 'yearly'
          ? 12
          : 1;

  // For yearly with a specific charge_month, anchor on (charge_month) of subStart's year.
  // For quarterly/semiannual, anchor on subStart's month so the cycle stays aligned.
  let cursor = subStart.startOf('month');
  if (sub.cadence === 'yearly' && sub.charge_month) {
    cursor = cursor.month(sub.charge_month - 1);
  }

  // Step backward to first cursor that is at or before windowStart, then step forward
  // to find all charges in window. (Avoids skipping if subStart is before the window
  // by a multiple of monthStep months.)
  while (cursor.isAfter(effectiveStart, 'month')) {
    cursor = cursor.subtract(monthStep, 'month');
  }

  while (cursor.isBefore(effectiveEnd) || cursor.isSame(effectiveEnd, 'month')) {
    const daysInMonth = cursor.daysInMonth();
    const day = Math.min(sub.charge_day, daysInMonth);
    const candidate = cursor.date(day);
    if (
      (candidate.isSame(effectiveStart, 'day') || candidate.isAfter(effectiveStart, 'day')) &&
      (candidate.isSame(effectiveEnd, 'day') || candidate.isBefore(effectiveEnd, 'day'))
    ) {
      dates.push(candidate.format('YYYY-MM-DD'));
    }
    cursor = cursor.add(monthStep, 'month');
    if (cursor.isAfter(windowEnd.add(monthStep, 'month'))) break;
  }
  return dates;
}
