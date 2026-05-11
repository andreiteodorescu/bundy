import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import { hashPin } from '@/lib/pin';
import type { Profile } from '@/types';

export const PROFILE_KEY = ['profile'] as const;

export function useProfile() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...PROFILE_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });
}

export function useUpdateProfileName() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!profileId) throw new Error('No profile');
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

export function useUpdateProfileIcon() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (icon: string) => {
      if (!profileId) throw new Error('No profile');
      const { error } = await supabase
        .from('profiles')
        .update({ icon })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

export function useSetHiddenPin() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (pin: string | null) => {
      if (!profileId) throw new Error('No profile');
      const hash = pin === null ? null : await hashPin(pin);
      const { error } = await supabase
        .from('profiles')
        .update({ hidden_pin_hash: hash })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}

/**
 * Helper to read profile.settings with type safety + defaults.
 * profile.settings is a free-form jsonb so future settings can be added without migration.
 */
export type ProfileSettings = {
  hidden_pin_ttl_min?: number;
  /**
   * When true, "paid with company card" UI is enabled across the app
   * (switch on expense forms, separate company total in widgets, badges in lists).
   * Defaults to false for new users. Existing users with company-card expenses
   * are migrated to true via 0028 so behavior is preserved.
   */
  company_card_enabled?: boolean;
};

export function readSettings(profile: Profile | null | undefined): ProfileSettings {
  return (profile?.settings as ProfileSettings | undefined) ?? {};
}

/**
 * Hook returning whether the "company card" feature is enabled for the current
 * profile. Returns false while loading (treat absent setting as off, except for
 * grandfathered profiles which the migration sets to true).
 */
export function useCompanyCardEnabled(): boolean {
  const profile = useProfile();
  return readSettings(profile.data).company_card_enabled === true;
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
    },
  });
}

export function useUpdateProfileSettings() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<ProfileSettings>) => {
      if (!profileId) throw new Error('No profile');
      // Read-modify-write so we don't blow away other settings keys
      const { data: current, error: fetchErr } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', profileId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const merged = {
        ...((current?.settings as ProfileSettings | null) ?? {}),
        ...patch,
      };
      const { error } = await supabase
        .from('profiles')
        .update({ settings: merged })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_KEY }),
  });
}
