import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFxRate } from '@/lib/fx';
import { formatMoney, type Currency } from '@/lib/money';
import { useDefaultCurrency } from '@/features/settings/api';

/**
 * Display currency conversion (Option C-B: on-the-fly with historical accuracy).
 *
 * Given a list of expenses (or expense-like rows with amount_original +
 * currency_original + amount_ron + occurred_on), converts each to the user's
 * preferred display currency using BNR rates from the EXPENSE'S DATE, not today.
 *
 * This means totals stay stable historically — if you cheltui 50 EUR in
 * January and look at it in May, you'll see it converted at January's rate,
 * not May's. Personal-tracking parity with the "amount_ron is pinned" model
 * Bundy already uses for the base RON storage.
 *
 * Math (per expense, given target currency D):
 *   - D === 'RON':       use amount_ron (already pinned at insert)
 *   - origCurrency === D: use amount_original (native, zero conversion)
 *   - else:              amount_ron / rate(D, occurred_on)
 *                         where rate(D, T) = how many RON 1 D is worth on date T
 *
 * Rate caching: BNR historical rates are immutable. Existing fx_rates table
 * already caches them. TanStack Query layers another in-memory cache on top
 * so re-renders are free. First visit on a new (currency, date_set)
 * combination might trigger a few BNR fetches; subsequent visits are instant.
 */

export type ExpenseLike = {
  amount_original: number | string;
  currency_original: Currency;
  amount_ron: number | string;
  occurred_on: string;
};

type UseDisplayConversionResult = {
  displayCurrency: Currency;
  /**
   * Convert a single expense to the display currency. Returns null if a
   * required rate isn't available yet (loading) — caller should show a
   * loading indicator or fall back. After isReady === true, never null.
   */
  convert: (e: ExpenseLike) => number | null;
  /** Total of all expenses in the display currency, or null if rates loading. */
  total: number | null;
  /** Formatted version of the total using the display currency. */
  formattedTotal: string | null;
  isLoading: boolean;
  /** True when all needed rates are cached and conversions are exact. */
  isReady: boolean;
  /** Format helper bound to the display currency for sub-totals etc. */
  formatInDisplay: (amount: number) => string;
};

/**
 * Build the set of (occurred_on) dates needed to compute conversions to the
 * display currency. Only dates of expenses that aren't already in the display
 * currency need a fresh rate — others use amount_original / amount_ron directly.
 */
function neededDates(expenses: ExpenseLike[], displayCurrency: Currency): string[] {
  if (displayCurrency === 'RON') return []; // RON uses amount_ron directly, no FX needed
  const set = new Set<string>();
  for (const e of expenses) {
    if (e.currency_original === displayCurrency) continue; // native, no rate needed
    set.add(e.occurred_on);
  }
  return Array.from(set);
}

export function useDisplayConversion(expenses: ExpenseLike[]): UseDisplayConversionResult {
  const displayCurrency = useDefaultCurrency();

  const dates = useMemo(
    () => neededDates(expenses, displayCurrency),
    [expenses, displayCurrency],
  );

  // Stable cache key — sort dates so the order of the input expenses doesn't
  // invalidate the cache when nothing actually changed.
  const cacheKey = useMemo(() => [...dates].sort().join(','), [dates]);

  const ratesQuery = useQuery({
    queryKey: ['fx_rates_batch', displayCurrency, cacheKey],
    enabled: displayCurrency !== 'RON' && dates.length > 0,
    staleTime: 6 * 60 * 60 * 1000, // 6h, BNR historical rates never change
    queryFn: async (): Promise<Map<string, number>> => {
      const map = new Map<string, number>();
      // Parallel fetch — getFxRate already serves from Supabase fx_rates cache
      // for any date that's been queried before, so this is fast in steady state.
      await Promise.all(
        dates.map(async (date) => {
          try {
            const r = await getFxRate(date, displayCurrency);
            map.set(date, r.rate_to_ron);
          } catch {
            // Silent skip — convert() will return null for this expense.
            // UI shows it as "pending" rather than mixing in stale data.
          }
        }),
      );
      return map;
    },
  });

  const convert = useCallback(
    (e: ExpenseLike): number | null => {
      if (displayCurrency === 'RON') return Number(e.amount_ron);
      if (e.currency_original === displayCurrency) return Number(e.amount_original);
      const rate = ratesQuery.data?.get(e.occurred_on);
      if (!rate) return null;
      return Number(e.amount_ron) / rate;
    },
    [displayCurrency, ratesQuery.data],
  );

  const isReady = displayCurrency === 'RON' || ratesQuery.isSuccess;

  const total = useMemo(() => {
    if (!isReady) return null;
    let sum = 0;
    for (const e of expenses) {
      const v = convert(e);
      if (v === null) return null; // any unresolved rate means total isn't trustworthy yet
      sum += v;
    }
    return sum;
  }, [expenses, convert, isReady]);

  const formatInDisplay = useCallback(
    (amount: number) => formatMoney(amount, displayCurrency),
    [displayCurrency],
  );

  const formattedTotal = total !== null ? formatInDisplay(total) : null;

  return {
    displayCurrency,
    convert,
    total,
    formattedTotal,
    isLoading: ratesQuery.isLoading,
    isReady,
    formatInDisplay,
  };
}

/**
 * Lightweight variant for when you have a pre-aggregated RON total (e.g. from
 * a server-side sum) and just want to display it in the user's currency using
 * TODAY's rate. Less accurate than per-expense historical conversion, but
 * appropriate for "running totals" of items being added live.
 *
 * Use the per-expense `useDisplayConversion` whenever you have the raw rows.
 */
export function useTodayDisplayRate(): {
  displayCurrency: Currency;
  rate: number | null;
  isReady: boolean;
  convertFromRon: (amountRon: number) => number | null;
  formatInDisplay: (amount: number) => string;
} {
  const displayCurrency = useDefaultCurrency();
  const today = new Date().toISOString().slice(0, 10);

  const rateQuery = useQuery({
    queryKey: ['fx_rate_today', displayCurrency, today],
    enabled: displayCurrency !== 'RON',
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async () => {
      const r = await getFxRate(today, displayCurrency);
      return r.rate_to_ron;
    },
  });

  const isReady = displayCurrency === 'RON' || rateQuery.isSuccess;
  const rate = displayCurrency === 'RON' ? 1 : rateQuery.data ?? null;

  return {
    displayCurrency,
    rate,
    isReady,
    convertFromRon: (amountRon: number) => {
      if (displayCurrency === 'RON') return amountRon;
      if (!rate) return null;
      return amountRon / rate;
    },
    formatInDisplay: (amount: number) => formatMoney(amount, displayCurrency),
  };
}
