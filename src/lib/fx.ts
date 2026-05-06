import dayjs from 'dayjs';
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
 *
 * - **Date azi sau în viitor** → mereu chemăm `/api/fx` (care fetchează BNR XML
 *   proaspăt și upsert-ează tot anul). Cache-ul ar putea fi stale (nimeni n-a
 *   întrebat recent de o dată mai nouă, deci BNR a publicat rate noi pe care
 *   nu le-am pull-uit). Vercel CDN cache-uiește răspunsul `/api/fx` 24h, deci
 *   apeluri repetate în aceeași zi sunt rapide.
 * - **Date trecute** → cache (ratele istorice BNR nu se schimbă; rapid și fiabil).
 * - **Cache miss pentru date trecute (rar)** → fallback la `/api/fx`.
 * - **Network error pe /api/fx pentru azi** → fallback la cea mai recentă rată
 *   cached, ca să nu blocăm useri offline.
 *
 * BNR nu publică weekend/sărbători. `/api/fx` returnează cea mai recentă rată
 * ≤ data cerută. Câmpul `.date` pe răspuns spune ce zi efectivă s-a folosit.
 */
export async function getFxRate(date: string, currency: Currency): Promise<FxRate> {
  if (currency === 'RON') {
    return { date, currency: 'RON', rate_to_ron: 1 };
  }

  const today = dayjs().format('YYYY-MM-DD');
  const isRecent = date >= today;

  if (isRecent) {
    // Live fetch — BNR poate avea rate publicate pe care cache-ul nu le are încă.
    try {
      const res = await fetch(
        `/api/fx?date=${encodeURIComponent(date)}&currency=${currency}`,
      );
      if (res.ok) {
        return (await res.json()) as FxRate;
      }
    } catch {
      // Network down — încercăm cache mai jos.
    }
    // Fallback offline: cea mai recentă rată cached (mai bine ceva decât crash).
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

  // Cache complet miss (date veche fără nicio rată cached) → fetch BNR.
  const res = await fetch(`/api/fx?date=${encodeURIComponent(date)}&currency=${currency}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch BNR rate for ${currency} on ${date}: ${res.status}`);
  }
  return (await res.json()) as FxRate;
}
