import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { round2, type Currency } from '@/lib/money';
import { todayIso } from '@/lib/dates';
import { EXPENSES_KEY } from '@/features/expenses/api';
import type { Expense, QuickExpense } from '@/types';

export const QUICK_EXPENSES_KEY = ['quick_expenses'] as const;
export const QUICK_TODAY_KEY = ['quick_today'] as const;

export function useQuickExpenses() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...QUICK_EXPENSES_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<QuickExpense[]> => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as QuickExpense[];
    },
  });
}

export function useQuickExpense(id: string | undefined) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...QUICK_EXPENSES_KEY, profileId, 'one', id],
    enabled: Boolean(profileId && id),
    queryFn: async (): Promise<QuickExpense | null> => {
      const { data, error } = await supabase
        .from('quick_expenses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as QuickExpense | null;
    },
  });
}

/**
 * Get today's aggregated expenses for all quick templates.
 * Returns a Map<template_id, expense> so the list page can display per-template counts.
 */
export function useQuickTodayAggregates() {
  const { profileId } = useAuth();
  const day = todayIso();
  return useQuery({
    queryKey: [...QUICK_TODAY_KEY, profileId, day],
    enabled: Boolean(profileId),
    staleTime: 0, // always fresh after stepper mutations
    queryFn: async (): Promise<Map<string, Expense>> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('source', 'quick')
        .eq('occurred_on', day);
      if (error) throw error;
      const map = new Map<string, Expense>();
      for (const e of (data ?? []) as Expense[]) {
        if (e.source_ref_id) map.set(e.source_ref_id, e);
      }
      return map;
    },
  });
}

export type UpsertQuickInput = {
  id?: string;
  name: string;
  amount: number;
  currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  icon: string | null;
  sort_order?: number;
  active?: boolean;
};

export function useUpsertQuickExpense() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertQuickInput): Promise<QuickExpense> => {
      if (!profileId) throw new Error('No profile selected');
      const payload = {
        profile_id: profileId,
        name: input.name.trim(),
        amount: input.amount,
        currency: input.currency,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        icon: input.icon,
        sort_order: input.sort_order ?? 999,
        active: input.active ?? true,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('quick_expenses')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as QuickExpense;
      }
      const { data, error } = await supabase
        .from('quick_expenses')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as QuickExpense;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUICK_EXPENSES_KEY }),
  });
}

export function useDeleteQuickExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quick_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUICK_EXPENSES_KEY });
      qc.invalidateQueries({ queryKey: QUICK_TODAY_KEY });
      qc.invalidateQueries({ queryKey: EXPENSES_KEY });
    },
  });
}

/**
 * Step the quantity of a quick template's daily aggregate by `delta`.
 *
 * - delta=+1 first time: INSERT new aggregate row with quantity=1
 * - delta=+1 subsequent: UPDATE quantity++, amount_original = qty × unit, amount_ron likewise
 * - delta=-1 when qty>1: UPDATE qty--
 * - delta=-1 when qty==1: DELETE the row
 *
 * V1 limitation: assumes quick templates use RON. For non-RON templates we'd need
 * to fetch BNR rate; this is an edge case (metro/loto are always lei) so deferred.
 */
export function useStepQuickExpense() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async ({
      template,
      delta,
      day,
    }: {
      template: QuickExpense;
      delta: 1 | -1;
      day?: string;
    }): Promise<{ quantity: number }> => {
      if (!profileId) throw new Error('No profile selected');
      const occurredOn = day ?? todayIso();
      const unit = Number(template.amount);

      const { data: existingArr, error: selErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('profile_id', profileId)
        .eq('source', 'quick')
        .eq('source_ref_id', template.id)
        .eq('occurred_on', occurredOn)
        .limit(1);
      if (selErr) throw selErr;
      const existing = existingArr?.[0] as Expense | undefined;

      if (!existing) {
        if (delta < 0) return { quantity: 0 };
        const { error } = await supabase.from('expenses').insert({
          profile_id: profileId,
          name: template.name,
          amount_original: round2(unit),
          currency_original: template.currency,
          amount_ron: round2(unit),
          occurred_on: occurredOn,
          category_id: template.category_id,
          subcategory_id: template.subcategory_id,
          source: 'quick',
          source_ref_id: template.id,
          quantity: 1,
          tags: ['quick'],
        });
        if (error) throw error;
        return { quantity: 1 };
      }

      const newQty = (existing.quantity ?? 1) + delta;
      if (newQty <= 0) {
        const { error } = await supabase.from('expenses').delete().eq('id', existing.id);
        if (error) throw error;
        return { quantity: 0 };
      }
      const { error } = await supabase
        .from('expenses')
        .update({
          quantity: newQty,
          amount_original: round2(unit * newQty),
          amount_ron: round2(unit * newQty),
        })
        .eq('id', existing.id);
      if (error) throw error;
      return { quantity: newQty };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUICK_TODAY_KEY });
      qc.invalidateQueries({ queryKey: EXPENSES_KEY });
    },
  });
}
