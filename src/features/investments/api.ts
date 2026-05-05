import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { getFxRate } from '@/lib/fx';
import { round2, type Currency } from '@/lib/money';
import type {
  InvestmentDirection,
  InvestmentInstrumentType,
  InvestmentTransaction,
} from '@/types';

export const INVESTMENTS_KEY = ['investments'] as const;

export function useInvestments() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...INVESTMENTS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<InvestmentTransaction[]> => {
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvestmentTransaction[];
    },
  });
}

export function useInvestment(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...INVESTMENTS_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<InvestmentTransaction | null> => {
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as InvestmentTransaction | null;
    },
  });
}

export type UpsertInvestmentInput = {
  id?: string;
  name: string;
  amount: number;
  currency: Currency;
  direction: InvestmentDirection;
  instrument_type: InvestmentInstrumentType;
  broker?: string | null;
  occurred_on: string;
  note?: string | null;
};

export function useUpsertInvestment() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertInvestmentInput): Promise<InvestmentTransaction> => {
      if (!profileId) throw new Error('No profile selected');

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
        instrument_type: input.instrument_type,
        broker: input.broker?.trim() || null,
        occurred_on: input.occurred_on,
        note: input.note?.trim() || null,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('investment_transactions')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as InvestmentTransaction;
      }
      const { data, error } = await supabase
        .from('investment_transactions')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as InvestmentTransaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVESTMENTS_KEY }),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('investment_transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: INVESTMENTS_KEY }),
  });
}

export const INSTRUMENT_TYPE_LABELS: Record<InvestmentInstrumentType, string> = {
  pension: 'Pensie (Pilon II/III)',
  etf: 'ETF',
  mutual_fund: 'Fond mutual',
  stock: 'Acțiuni',
  bonds: 'Obligațiuni',
  crypto: 'Crypto',
  real_estate: 'Imobiliare',
  other: 'Altele',
};
