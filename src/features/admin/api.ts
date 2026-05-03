import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';

export const ADMIN_USERS_KEY = ['admin', 'users'] as const;
export const ADMIN_IS_ADMIN_KEY = ['admin', 'is_admin'] as const;

/**
 * One row per registered user, joined with their profile and expense count.
 * Returned by the admin_list_users RPC.
 */
export type AdminUser = {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  user_created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  profile_id: string | null;
  profile_name: string | null;
  profile_icon: string | null;
  is_admin_flag: boolean;
  expense_count: number;
};

/** Whether the currently signed-in user has the admin flag set on their profile_member row. */
export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...ADMIN_IS_ADMIN_KEY, user?.id ?? null],
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('profile_members')
        .select('is_admin')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.is_admin);
    },
  });
}

/** Lists all users (admin-only). Returns AdminUser[]. */
export function useAdminUsers() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY],
    enabled: isAdmin.data === true,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc('admin_list_users');
      if (error) throw error;
      return ((data ?? []) as AdminUser[]).map((r) => ({
        ...r,
        expense_count: Number(r.expense_count),
      }));
    },
  });
}

export function useAdminBan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ban }: { userId: string; ban: boolean }) => {
      const { error } = await supabase.rpc('admin_ban_user', {
        target_user_id: userId,
        ban,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

export function useAdminDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

/**
 * Trigger a password-reset email for a user (no admin RPC needed — this Supabase API
 * works for any email, even when not signed in).
 */
export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
  });
}
