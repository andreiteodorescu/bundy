import { supabase } from './supabase';
import type { Currency } from './money';

export type FxRate = {
  date: string;
  currency: Currency;
  rate_to_ron: number;
};

/**
 * Get the EUR/USD → RON rate for a specific date. RON returns 1.
 *
 * Strategy:
 * 1. Look up `fx_rates` table (cached BNR data).
 * 2. On miss, call `/api/fx?date=YYYY-MM-DD&currency=EUR` (Vercel function proxies BNR XML).
 * 3. The serverless function upserts into `fx_rates` so future calls hit cache.
 *
 * Note: BNR doesn't publish weekends/holidays. The /api/fx endpoint falls back to the
 * most recent prior business day automatically. The returned `date` field on the result
 * tells you which day's rate was actually used.
 */
export async function getFxRate(date: string, currency: Currency): Promise<FxRate> {
  if (currency === 'RON') {
    return { date, currency: 'RON', rate_to_ron: 1 };
  }

  const cached = await supabase
    .from('fx_rates')
    .select('date, currency, rate_to_ron')
    .eq('currency', currency)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached.data) {
    return {
      date: cached.data.date,
      currency: cached.data.currency as Currency,
      rate_to_ron: Number(cached.data.rate_to_ron),
    };
  }

  const res = await fetch(`/api/fx?date=${encodeURIComponent(date)}&currency=${currency}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch BNR rate for ${currency} on ${date}: ${res.status}`);
  }
  const json = (await res.json()) as FxRate;
  return json;
}
