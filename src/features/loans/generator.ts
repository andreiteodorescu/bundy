import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { getFxRate } from '@/lib/fx';
import { round2 } from '@/lib/money';
import type { Loan } from '@/types';

const FLAG_KEY = 'bundy.loans.lastRun';

/**
 * Materialize loan installment expenses for any charge dates between (today - 30 days) and today
 * that haven't been recorded yet, AND that fall on or before the loan's end_date.
 *
 * Idempotent. Runs on app boot, gated by a same-day flag in localStorage.
 *
 * Differences from subscription generator:
 *  - Always monthly cadence
 *  - Stops generating after end_date (loan is fully paid)
 *  - Inserts with source='loan' (separate analytics filter)
 *  - Tags with 'loan' for visibility
 */
export async function runLoanGenerator(profileId: string): Promise<{ created: number }> {
  const today = dayjs().format('YYYY-MM-DD');
  if (typeof window !== 'undefined' && window.localStorage.getItem(FLAG_KEY) === today) {
    return { created: 0 };
  }

  const { data: loans, error } = await supabase
    .from('loans')
    .select('*')
    .eq('active', true);
  if (error) throw error;

  let created = 0;
  for (const loan of (loans ?? []) as Loan[]) {
    const dates = chargeDatesInWindow(loan, dayjs().subtract(30, 'day'), dayjs());
    for (const date of dates) {
      const existing = await supabase
        .from('expenses')
        .select('id')
        .eq('profile_id', profileId)
        .eq('source', 'loan')
        .eq('source_ref_id', loan.id)
        .eq('occurred_on', date)
        .maybeSingle();
      if (existing.data) continue;

      let amountRon = Number(loan.monthly_payment);
      let fxRate: number | null = null;
      let fxRateDate: string | null = null;
      if (loan.currency !== 'RON') {
        try {
          const rate = await getFxRate(date, loan.currency);
          amountRon = round2(Number(loan.monthly_payment) * rate.rate_to_ron);
          fxRate = rate.rate_to_ron;
          fxRateDate = rate.date;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(`[bundy] FX fetch failed for loan ${loan.name} on ${date}; skipping`, err);
          continue;
        }
      }

      const { error: insertErr } = await supabase.from('expenses').insert({
        profile_id: profileId,
        name: loan.bank ? `${loan.name} (${loan.bank})` : loan.name,
        amount_original: Number(loan.monthly_payment),
        currency_original: loan.currency,
        amount_ron: amountRon,
        fx_rate: fxRate,
        fx_rate_date: fxRateDate,
        occurred_on: date,
        category_id: loan.category_id,
        subcategory_id: loan.subcategory_id,
        tags: ['loan'],
        source: 'loan',
        source_ref_id: loan.id,
        note: loan.note,
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
 * Charge dates for a loan in [windowStart, windowEnd], capped at end_date.
 * Always monthly. Clamps charge_day to last day of month if month is shorter.
 */
export function chargeDatesInWindow(
  loan: Loan,
  windowStart: dayjs.Dayjs,
  windowEnd: dayjs.Dayjs,
): string[] {
  const dates: string[] = [];
  const loanStart = dayjs(loan.start_date);
  const effectiveStart = loanStart.isAfter(windowStart) ? loanStart : windowStart;
  const loanEnd = loan.end_date ? dayjs(loan.end_date) : null;
  const cappedEnd = loanEnd && loanEnd.isBefore(windowEnd) ? loanEnd : windowEnd;

  let cursor = effectiveStart.startOf('month');
  while (cursor.isBefore(cappedEnd) || cursor.isSame(cappedEnd, 'month')) {
    const daysInMonth = cursor.daysInMonth();
    const day = Math.min(loan.charge_day, daysInMonth);
    const candidate = cursor.date(day);
    if (
      (candidate.isSame(effectiveStart, 'day') || candidate.isAfter(effectiveStart, 'day')) &&
      (candidate.isSame(cappedEnd, 'day') || candidate.isBefore(cappedEnd, 'day'))
    ) {
      dates.push(candidate.format('YYYY-MM-DD'));
    }
    cursor = cursor.add(1, 'month');
    if (cursor.isAfter(windowEnd.add(1, 'month'))) break;
  }
  return dates;
}
