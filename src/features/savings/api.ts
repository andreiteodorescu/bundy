import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { getFxRate } from '@/lib/fx';
import { round2, type Currency } from '@/lib/money';
import type { SavingsDirection, SavingsTransaction } from '@/types';

export const SAVINGS_KEY = ['savings'] as const;

export function useSavings() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...SAVINGS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<SavingsTransaction[]> => {
      const { data, error } = await supabase
        .from('savings_transactions')
        .select('*')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavingsTransaction[];
    },
  });
}

export function useSaving(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...SAVINGS_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<SavingsTransaction | null> => {
      const { data, error } = await supabase
        .from('savings_transactions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SavingsTransaction | null;
    },
  });
}

export type UpsertSavingInput = {
  id?: string;
  name: string;
  amount: number;
  currency: Currency;
  direction: SavingsDirection;
  account_name?: string | null;
  occurred_on: string;
  note?: string | null;
};

export function useUpsertSaving() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertSavingInput): Promise<SavingsTransaction> => {
      if (!profileId) throw new Error('No profile selected');

      // Convert to RON via BNR if foreign currency
      let amountRon = input.amount;
      let fxRate: number | null = null;
      let fxRateDate: string | null = null;
      if (input.currency !== 'RON') {
        const rate = await getFxRate(input.occurred_on, input.currency);
        amountRon = round2(input.amount * rate.rate_to_ron);
        fxRate = rate.rate_to_ron;
        fxRateDate = rate.date;
      }

      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount: input.amount,
        currency: input.currency,
        amount_ron: amountRon,
        fx_rate: fxRate,
        fx_rate_date: fxRateDate,
        direction: input.direction,
        account_name: input.account_name?.trim() || null,
        occurred_on: input.occurred_on,
        note: input.note?.trim() || null,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('savings_transactions')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as SavingsTransaction;
      }
      const { data, error } = await supabase
        .from('savings_transactions')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as SavingsTransaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVINGS_KEY }),
  });
}

export function useDeleteSaving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVINGS_KEY }),
  });
}
