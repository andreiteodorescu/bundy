import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Currency } from '@/lib/money';
import type { Subscription, SubscriptionCadence } from '@/types';

export const SUBSCRIPTIONS_KEY = ['subscriptions'] as const;

export function useSubscriptions() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Subscription[]> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('active', { ascending: false })
        .order('charge_day', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });
}

export function useSubscription(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...SUBSCRIPTIONS_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<Subscription | null> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Subscription | null;
    },
  });
}

export type UpsertSubscriptionInput = {
  id?: string;
  name: string;
  amount: number;
  currency: Currency;
  cadence: SubscriptionCadence;
  charge_day: number;
  charge_month?: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  tags?: string[];
  active: boolean;
  start_date: string;
  end_date?: string | null;
  brand_logo?: string | null;
};

export function useUpsertSubscription() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertSubscriptionInput): Promise<Subscription> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount: input.amount,
        currency: input.currency,
        cadence: input.cadence,
        charge_day: input.charge_day,
        charge_month: input.cadence === 'yearly' ? input.charge_month ?? null : null,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        tags: input.tags ?? [],
        active: input.active,
        start_date: input.start_date,
        end_date: input.end_date ?? null,
        brand_logo: input.brand_logo ?? null,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('subscriptions')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Subscription;
      }
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }),
  });
}

export function useToggleSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }),
  });
}
