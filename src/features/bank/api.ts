import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type { BankConnection, BankImportRule, BankTransaction } from '@/types';

export const BANK_CONNECTIONS_KEY = ['bank_connections'] as const;
export const BANK_RULES_KEY = ['bank_import_rules'] as const;
export const BANK_PENDING_KEY = ['bank_pending_transactions'] as const;

export function useBankConnections() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BANK_CONNECTIONS_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_connections')
        .select('*')
        .eq('profile_id', profileId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BankConnection[];
    },
  });
}

export function useBankImportRules() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BANK_RULES_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_import_rules')
        .select('*')
        .eq('profile_id', profileId!)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BankImportRule[];
    },
  });
}

export function useBankPendingTransactions() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BANK_PENDING_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('profile_id', profileId!)
        .eq('status', 'pending_review')
        .order('occurred_on', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as BankTransaction[];
    },
  });
}

type RuleInput = {
  keywords: string[];
  category_id: string;
  subcategory_id: string | null;
  priority: number;
  enabled: boolean;
};

export function useUpsertBankRule() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: RuleInput & { id?: string }) => {
      if (!profileId) throw new Error('No profile');
      const { id, ...fields } = input;
      if (id) {
        const { error } = await supabase
          .from('bank_import_rules')
          .update(fields)
          .eq('id', id)
          .eq('profile_id', profileId);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from('bank_import_rules')
        .insert({ profile_id: profileId, ...fields })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_RULES_KEY });
    },
  });
}

export function useDeleteBankRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_import_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_RULES_KEY });
    },
  });
}

export function useDisconnectBankConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deleteImported }: { id: string; deleteImported: boolean }) => {
      if (deleteImported) {
        // Delete imported expenses linked to this connection's transactions.
        const { data: txs } = await supabase
          .from('bank_transactions')
          .select('expense_id')
          .eq('connection_id', id)
          .not('expense_id', 'is', null);
        const expenseIds = (txs ?? []).map((t) => t.expense_id).filter((x): x is string => !!x);
        if (expenseIds.length > 0) {
          await supabase.from('expenses').delete().in('id', expenseIds);
        }
      }
      const { error } = await supabase
        .from('bank_connections')
        .update({ status: 'disconnected' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useInitBankConnection() {
  return useMutation({
    mutationFn: async (input: { institution_id: string; institution_name: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/bank/init', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          institution_id: input.institution_id,
          institution_name: input.institution_name,
          redirect_origin: window.location.origin,
          language: document.documentElement.lang?.toUpperCase().slice(0, 2) || 'EN',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      return body as { link: string; requisition_id: string; reference: string };
    },
  });
}

export function useTriggerBankSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connection_id: connectionId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      return body as { imported: number; pending: number; fetched: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BANK_CONNECTIONS_KEY });
      qc.invalidateQueries({ queryKey: BANK_PENDING_KEY });
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useImportedExpensesCount(connectionId: string) {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...BANK_CONNECTIONS_KEY, 'imported_count', connectionId, profileId],
    enabled: Boolean(profileId && connectionId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bank_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connectionId)
        .not('expense_id', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
