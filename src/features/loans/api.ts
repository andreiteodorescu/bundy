import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Currency } from '@/lib/money';
import type { Loan } from '@/types';

export const LOANS_KEY = ['loans'] as const;

export function useLoans() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...LOANS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('active', { ascending: false })
        .order('charge_day', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Loan[];
    },
  });
}

export function useLoan(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...LOANS_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<Loan | null> => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Loan | null;
    },
  });
}

export type UpsertLoanInput = {
  id?: string;
  name: string;
  bank: string | null;
  total_amount: number | null;
  monthly_payment: number;
  currency: Currency;
  charge_day: number;
  start_date: string;
  end_date: string | null;
  interest_rate: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  active: boolean;
  tags?: string[];
  note: string | null;
};

export function useUpsertLoan() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertLoanInput): Promise<Loan> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        bank: input.bank?.trim() || null,
        total_amount: input.total_amount,
        monthly_payment: input.monthly_payment,
        currency: input.currency,
        charge_day: input.charge_day,
        start_date: input.start_date,
        end_date: input.end_date,
        interest_rate: input.interest_rate,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        active: input.active,
        tags: input.tags ?? [],
        note: input.note,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('loans')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Loan;
      }
      const { data, error } = await supabase
        .from('loans')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Loan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LOANS_KEY }),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LOANS_KEY }),
  });
}

export function useToggleLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('loans').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LOANS_KEY }),
  });
}
