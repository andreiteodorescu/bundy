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
    // Patch the cache with the returned row so the list (and its computed total)
    // updates instantly. Background invalidation reconciles with server state.
    onSuccess: (saved) => {
      qc.setQueryData<Subscription[]>(SUBSCRIPTIONS_KEY, (old) => {
        if (!old) return [saved];
        const idx = old.findIndex((s) => s.id === saved.id);
        if (idx >= 0) {
          const copy = old.slice();
          copy[idx] = saved;
          return copy;
        }
        return [...old, saved];
      });
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Subscription[]>(SUBSCRIPTIONS_KEY, (old) =>
        old?.filter((s) => s.id !== id) ?? [],
      );
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
    },
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
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: SUBSCRIPTIONS_KEY });
      const previous = qc.getQueryData<Subscription[]>(SUBSCRIPTIONS_KEY);
      qc.setQueryData<Subscription[]>(SUBSCRIPTIONS_KEY, (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, active } : s)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SUBSCRIPTIONS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }),
  });
}
