import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Expense } from '@/types';

export const ANALYTICS_KEY = ['analytics'] as const;

/**
 * Fetch all expenses in a date range (used by analytics aggregations).
 */
export function useExpensesInRange(start: string, end: string) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...ANALYTICS_KEY, profileId, 'range', start, end],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('occurred_on', start)
        .lte('occurred_on', end);
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}

/**
 * Last N months of monthly totals. Returns ascending by month so charts read left-to-right.
 * Optional filter narrows aggregation to a specific category or subcategory.
 */
export function useMonthlyTotals(
  monthsBack = 6,
  filter?: {
    categoryId?: string | null;
    subcategoryId?: string | null;
    /** When true (default), expenses tagged `company-card` are excluded from totals. */
    excludeCompanyCard?: boolean;
  },
) {
  const start = dayjs().subtract(monthsBack - 1, 'month').startOf('month').format('YYYY-MM-DD');
  const end = dayjs().endOf('month').format('YYYY-MM-DD');
  const expenses = useExpensesInRange(start, end);
  const excludeCompanyCard = filter?.excludeCompanyCard ?? true;

  const totals: { month: string; label: string; total: number }[] = [];
  if (expenses.data) {
    const filtered = expenses.data.filter((e) => {
      if (excludeCompanyCard && e.tags?.includes('company-card')) return false;
      if (filter?.subcategoryId) return e.subcategory_id === filter.subcategoryId;
      if (filter?.categoryId) return e.category_id === filter.categoryId;
      return true;
    });
    const by = new Map<string, number>();
    for (const e of filtered) {
      const k = dayjs(e.occurred_on).format('YYYY-MM');
      by.set(k, (by.get(k) ?? 0) + Number(e.amount_ron));
    }
    let cursor = dayjs(start);
    for (let i = 0; i < monthsBack; i++) {
      const k = cursor.format('YYYY-MM');
      totals.push({
        month: k,
        label: cursor.format('MMM').replace(/^./, (c) => c.toUpperCase()),
        total: by.get(k) ?? 0,
      });
      cursor = cursor.add(1, 'month');
    }
  }
  return { ...expenses, monthlyTotals: totals };
}
