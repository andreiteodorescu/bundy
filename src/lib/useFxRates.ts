import { useQueries } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getFxRate } from './fx';
import type { Currency } from './money';

/**
 * Fetch today's BNR rates for every non-RON currency in `currencies`.
 * Returns a stable lookup helper + loading flag so list pages can render
 * an inline "≈ X RON" estimate next to foreign-currency amounts.
 *
 * Caches per-currency for 6h via React Query (BNR publishes one rate per day).
 */
export function useFxRates(currencies: Array<Currency | string | null | undefined>) {
  const today = dayjs().format('YYYY-MM-DD');
  const unique = Array.from(
    new Set(currencies.filter((c): c is string => Boolean(c) && c !== 'RON')),
  ) as Currency[];

  const queries = useQueries({
    queries: unique.map((c) => ({
      queryKey: ['fx', today, c] as const,
      queryFn: () => getFxRate(today, c),
      staleTime: 6 * 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const rateMap = new Map<string, number>([['RON', 1]]);
  queries.forEach((q, i) => {
    if (q.data) rateMap.set(unique[i], q.data.rate_to_ron);
  });

  return {
    rateOf(currency: string | null | undefined): number | null {
      if (!currency) return null;
      return rateMap.get(currency) ?? null;
    },
    isLoading: queries.some((q) => q.isLoading),
  };
}
