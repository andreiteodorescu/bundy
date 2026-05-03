import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Currency } from '@/lib/money';
import type { PredefinedExpense } from '@/types';

export const PREDEFINED_EXPENSES_KEY = ['predefined_expenses'] as const;

export function usePredefinedExpenses() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...PREDEFINED_EXPENSES_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<PredefinedExpense[]> => {
      const { data, error } = await supabase
        .from('predefined_expenses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PredefinedExpense[];
    },
  });
}

export function usePredefinedExpense(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...PREDEFINED_EXPENSES_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<PredefinedExpense | null> => {
      const { data, error } = await supabase
        .from('predefined_expenses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PredefinedExpense | null;
    },
  });
}

export type UpsertPredefinedInput = {
  id?: string;
  name: string;
  default_currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  icon: string | null;
  sort_order?: number;
  active?: boolean;
};

export function useUpsertPredefined() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertPredefinedInput): Promise<PredefinedExpense> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        default_currency: input.default_currency,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        icon: input.icon,
        sort_order: input.sort_order ?? 999,
        active: input.active ?? true,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('predefined_expenses')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as PredefinedExpense;
      }
      const { data, error } = await supabase
        .from('predefined_expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as PredefinedExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PREDEFINED_EXPENSES_KEY }),
  });
}

export function useDeletePredefined() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('predefined_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PREDEFINED_EXPENSES_KEY }),
  });
}
