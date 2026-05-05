import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Budget, BudgetPeriodKind } from '@/types';

export const BUDGETS_KEY = ['budgets'] as const;

export function useBudgets() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BUDGETS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Budget[];
    },
  });
}

export function useReorderBudgets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const updates = ids.map((id, index) =>
        supabase.from('budgets').update({ sort_order: index }).eq('id', id),
      );
      await Promise.all(updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useBudget(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BUDGETS_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<Budget | null> => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Budget | null;
    },
  });
}

export type UpsertBudgetInput = {
  id?: string;
  name: string;
  amount_ron: number;
  period_kind: BudgetPeriodKind;
  period_start: string;
  period_end: string;
  selected_days?: string[] | null;
  thresholds_pct?: number[];
  /** Optional scope: parent categories (include all subcategories under). */
  category_ids?: string[];
  /** Optional scope: specific subcategories. Combined with category_ids via OR. */
  subcategory_ids?: string[];
};

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertBudgetInput): Promise<Budget> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount_ron: input.amount_ron,
        period_kind: input.period_kind,
        period_start: input.period_start,
        period_end: input.period_end,
        selected_days: input.selected_days ?? null,
        thresholds_pct: input.thresholds_pct ?? [50, 75, 90, 100],
        category_ids: input.category_ids ?? [],
        subcategory_ids: input.subcategory_ids ?? [],
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('budgets')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Budget;
      }
      const { data, error } = await supabase
        .from('budgets')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Budget;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

/**
 * Compute the spent amount for a budget by summing expense.amount_ron for occurred_on dates
 * that fall within the budget's selected_days (if `period_kind = 'days'`) or [period_start, period_end].
 */
export function useBudgetProgress(budget: Budget | null | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BUDGETS_KEY, profileId, 'progress', budget?.id, budget?.period_start, budget?.period_end],
    enabled: Boolean(profileId && budget),
    queryFn: async (): Promise<{ spent: number; pct: number; remaining: number }> => {
      if (!budget) return { spent: 0, pct: 0, remaining: 0 };
      let query = supabase.from('expenses').select('amount_ron, occurred_on, category_id, subcategory_id');

      // Time filter
      if (budget.period_kind === 'days' && budget.selected_days && budget.selected_days.length > 0) {
        query = query.in('occurred_on', budget.selected_days);
      } else {
        query = query.gte('occurred_on', budget.period_start).lte('occurred_on', budget.period_end);
      }
      // Category + subcategory filter combined with OR (Postgrest .or syntax)
      const cats = budget.category_ids ?? [];
      const subs = budget.subcategory_ids ?? [];
      if (cats.length > 0 || subs.length > 0) {
        const ors: string[] = [];
        if (cats.length > 0) ors.push(`category_id.in.(${cats.join(',')})`);
        if (subs.length > 0) ors.push(`subcategory_id.in.(${subs.join(',')})`);
        query = query.or(ors.join(','));
      }
      const { data, error } = await query;
      if (error) throw error;
      const spent = (data ?? []).reduce((s, r) => s + Number(r.amount_ron), 0);
      const pct = budget.amount_ron > 0 ? (spent / Number(budget.amount_ron)) * 100 : 0;
      return {
        spent,
        pct,
        remaining: Number(budget.amount_ron) - spent,
      };
    },
  });
}

/**
 * Get all budgets that are currently active (today falls within their period). For
 * period_kind='days' a budget is active if today is in selected_days OR today is between
 * the min and max of selected_days.
 */
export function useActiveBudgets() {
  const all = useBudgets();
  const today = dayjs().format('YYYY-MM-DD');
  const active = (all.data ?? []).filter((b) => {
    if (b.period_kind === 'days' && b.selected_days?.length) {
      return b.selected_days.includes(today);
    }
    return today >= b.period_start && today <= b.period_end;
  });
  return { ...all, data: active };
}
