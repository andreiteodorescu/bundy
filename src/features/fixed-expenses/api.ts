import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Currency } from '@/lib/money';
import type { FixedExpense } from '@/types';

export const FIXED_EXPENSES_KEY = ['fixed_expenses'] as const;

export function useFixedExpenses() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...FIXED_EXPENSES_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<FixedExpense[]> => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FixedExpense[];
    },
  });
}

export function useFixedExpense(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...FIXED_EXPENSES_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<FixedExpense | null> => {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FixedExpense | null;
    },
  });
}

export type UpsertFixedInput = {
  id?: string;
  name: string;
  amount: number;
  currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  tags?: string[];
  sort_order?: number;
};

export function useUpsertFixedExpense() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertFixedInput): Promise<FixedExpense> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount: input.amount,
        currency: input.currency,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        tags: input.tags ?? [],
        sort_order: input.sort_order ?? 999,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('fixed_expenses')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as FixedExpense;
      }
      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as FixedExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FIXED_EXPENSES_KEY }),
  });
}

export function useDeleteFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fixed_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FIXED_EXPENSES_KEY }),
  });
}

export function useReorderFixedExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from('fixed_expenses').update({ sort_order: index }).eq('id', id),
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FIXED_EXPENSES_KEY }),
  });
}
