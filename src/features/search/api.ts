import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@mantine/hooks';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { normalize } from '@/lib/text';
import type { Expense } from '@/types';
import { parseSearch, sanitizeForIlike } from './parseSearch';

export const SEARCH_KEY = ['search'] as const;
export const SEARCH_LIMIT = 200;
const DEBOUNCE_MS = 250;
const MIN_QUERY_LEN = 2;

/**
 * Live, debounced search over expenses.
 *
 * Strategy:
 *   1. Debounce input 250ms (don't fire on every keystroke).
 *   2. Parse input → number / date / month / text.
 *   3. Build a single Postgres query (server-side filtering, no client scan):
 *      - number   : amount_ron BETWEEN value*0.95 AND value*1.05
 *      - date     : occurred_on = ISO
 *      - month    : occurred_on in month
 *      - text     : name ILIKE OR note ILIKE OR category_id IN matching OR subcategory_id IN matching
 *                   (matching cat/sub IDs are computed client-side using normalize() so
 *                    "bacanie" matches "Băcănie")
 *   4. ORDER BY occurred_on DESC, LIMIT 200.
 *   5. TanStack Query caches by `[profileId, debouncedInput]` so re-typing the same
 *      query is instant.
 *
 * Performance: relies on the GIN trigram indexes from migration 0016 for ILIKE.
 */
export function useSearchExpenses(input: string) {
  const [debounced] = useDebouncedValue(input, DEBOUNCE_MS);
  const { profileId } = useAuth();
  const cats = useCategories();
  const subs = useSubcategories();

  // Pre-compute matching category & subcategory IDs by normalized name.
  // Done in useMemo so we don't recompute on every render.
  const lookupIds = useMemo(() => {
    const t = normalize(debounced.trim());
    if (!t || t.length < MIN_QUERY_LEN) return { catIds: [] as string[], subIds: [] as string[] };
    return {
      catIds: (cats.data ?? []).filter((c) => normalize(c.name).includes(t)).map((c) => c.id),
      subIds: (subs.data ?? []).filter((s) => normalize(s.name).includes(t)).map((s) => s.id),
    };
  }, [debounced, cats.data, subs.data]);

  return useQuery({
    queryKey: [...SEARCH_KEY, profileId, debounced, lookupIds.catIds, lookupIds.subIds],
    enabled: Boolean(profileId && debounced.trim().length >= MIN_QUERY_LEN),
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Expense[]> => {
      const parsed = parseSearch(debounced);
      let q = supabase.from('expenses').select('*').eq('hidden', false);

      if (parsed.kind === 'number') {
        const tol = parsed.value * 0.05;
        q = q
          .gte('amount_ron', parsed.value - tol)
          .lte('amount_ron', parsed.value + tol);
      } else if (parsed.kind === 'date') {
        q = q.eq('occurred_on', parsed.iso);
      } else if (parsed.kind === 'month') {
        const start = `${parsed.ym}-01`;
        const end = dayjs(start).endOf('month').format('YYYY-MM-DD');
        q = q.gte('occurred_on', start).lte('occurred_on', end);
      } else {
        const safe = sanitizeForIlike(parsed.raw);
        if (!safe) return [];
        const conditions: string[] = [
          `name.ilike.%${safe}%`,
          `note.ilike.%${safe}%`,
        ];
        if (lookupIds.catIds.length > 0) {
          conditions.push(`category_id.in.(${lookupIds.catIds.join(',')})`);
        }
        if (lookupIds.subIds.length > 0) {
          conditions.push(`subcategory_id.in.(${lookupIds.subIds.join(',')})`);
        }
        q = q.or(conditions.join(','));
      }

      const { data, error } = await q
        .order('occurred_on', { ascending: false })
        .limit(SEARCH_LIMIT);
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}
