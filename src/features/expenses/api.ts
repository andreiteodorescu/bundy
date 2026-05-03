import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { getFxRate } from '@/lib/fx';
import { round2, type Currency } from '@/lib/money';
import type { BrandRule, Expense, ExpenseSource } from '@/types';
import { seedBrandRules } from '@/data/brandRules.seed';

export const EXPENSES_KEY = ['expenses'] as const;
export const BRAND_RULES_KEY = ['brand_rules'] as const;

export function useExpensesByMonth(monthAnchor: string) {
  const { profileId } = useAuth();
  const start = dayjs(monthAnchor).startOf('month').format('YYYY-MM-DD');
  const end = dayjs(monthAnchor).endOf('month').format('YYYY-MM-DD');

  return useQuery({
    queryKey: [...EXPENSES_KEY, profileId, 'month', start, end],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('occurred_on', start)
        .lte('occurred_on', end)
        .order('occurred_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}

export function useExpense(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...EXPENSES_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<Expense | null> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Expense | null;
    },
  });
}

export function useRecentExpenses(limit = 500) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...EXPENSES_KEY, profileId, 'recent', limit],
    enabled: Boolean(profileId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('hidden', false)
        .order('occurred_on', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Expense[];
    },
  });
}

export type UpsertExpenseInput = {
  id?: string;
  name: string;
  amount_original: number;
  currency_original: Currency;
  occurred_on: string;
  category_id: string | null;
  subcategory_id: string | null;
  note?: string | null;
  tags?: string[];
  source?: ExpenseSource;
  source_ref_id?: string | null;
  recurrence?: Record<string, unknown> | null;
  hidden?: boolean;
};

export function useUpsertExpense() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertExpenseInput): Promise<Expense> => {
      if (!profileId) throw new Error('No profile selected');

      let amountRon = input.amount_original;
      let fxRate: number | null = null;
      let fxRateDate: string | null = null;
      if (input.currency_original !== 'RON') {
        const rate = await getFxRate(input.occurred_on, input.currency_original);
        amountRon = round2(input.amount_original * rate.rate_to_ron);
        fxRate = rate.rate_to_ron;
        fxRateDate = rate.date;
      }

      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount_original: input.amount_original,
        currency_original: input.currency_original,
        amount_ron: amountRon,
        fx_rate: fxRate,
        fx_rate_date: fxRateDate,
        occurred_on: input.occurred_on,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        note: input.note ?? null,
        tags: input.tags ?? [],
        source: input.source ?? 'manual',
        source_ref_id: input.source_ref_id ?? null,
        recurrence: input.recurrence ?? null,
        hidden: input.hidden ?? false,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Expense;
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EXPENSES_KEY }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: EXPENSES_KEY }),
  });
}

/**
 * Brand rules used by the smart autocomplete. Combines:
 *   - User-defined rules (in DB, profile-scoped) — highest priority
 *   - Seed rules from `brandRules.seed.ts` — global fallback
 *
 * The seed rules are NOT stored in DB (they're shipped with the app and resolved against
 * the user's category IDs at runtime via slug → ID lookup).
 */
export function useBrandRules(slugToCategoryId: Map<string, string>, slugToSubcategoryId: Map<string, string>) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BRAND_RULES_KEY, profileId],
    enabled: Boolean(profileId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ userRules: BrandRule[]; seedRules: BrandRule[] }> => {
      const { data, error } = await supabase
        .from('brand_rules')
        .select('*')
        .eq('profile_id', profileId!);
      if (error) throw error;

      const userRules = (data ?? []) as BrandRule[];

      const seedRules: BrandRule[] = seedBrandRules.map((r, i) => ({
        id: `seed-${i}`,
        profile_id: null,
        pattern: r.pattern,
        match_kind: r.match_kind ?? 'contains',
        category_id: slugToCategoryId.get(r.category_slug) ?? null,
        subcategory_id: r.subcategory_slug
          ? slugToSubcategoryId.get(r.subcategory_slug) ?? null
          : null,
        priority: r.priority ?? 0,
      }));

      return { userRules, seedRules };
    },
  });
}
