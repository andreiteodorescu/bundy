import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthProvider';
import type {
  Feedback,
  FeedbackComment,
  FeedbackNotification,
  FeedbackStatus,
  FeedbackType,
  FeedbackVote,
} from '@/types';

export const FEEDBACK_KEY = ['feedback'] as const;
export const FEEDBACK_VOTES_KEY = ['feedback_votes'] as const;
export const FEEDBACK_NOTIF_KEY = ['feedback_notifications'] as const;
export const FEEDBACK_COMMENTS_KEY = ['feedback_comments'] as const;
export const FEEDBACK_AUTHORS_KEY = ['feedback_authors'] as const;

export const BUG_STATUSES: FeedbackStatus[] = ['open', 'in_progress', 'fixed', 'wont_fix'];
export const FEATURE_STATUSES: FeedbackStatus[] = [
  'proposed',
  'planned',
  'in_progress',
  'done',
  'declined',
];

export function defaultStatusFor(type: FeedbackType): FeedbackStatus {
  return type === 'bug' ? 'open' : 'proposed';
}

export function statusesFor(type: FeedbackType): FeedbackStatus[] {
  return type === 'bug' ? BUG_STATUSES : FEATURE_STATUSES;
}

export function useFeedbackList() {
  return useQuery({
    queryKey: FEEDBACK_KEY,
    queryFn: async (): Promise<Feedback[]> => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('votes_count', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Feedback[];
    },
  });
}

export function useFeedbackVotes() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...FEEDBACK_VOTES_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('feedback_votes')
        .select('feedback_id')
        .eq('profile_id', profileId!);
      if (error) throw error;
      return new Set(((data ?? []) as Pick<FeedbackVote, 'feedback_id'>[]).map((v) => v.feedback_id));
    },
  });
}

export type UpsertFeedbackInput = {
  id?: string;
  type: FeedbackType;
  title: string;
  body: string;
};

export function useUpsertFeedback() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertFeedbackInput) => {
      if (!profileId) throw new Error('No profile');
      if (input.id) {
        const { error } = await supabase
          .from('feedback')
          .update({ title: input.title.trim(), body: input.body.trim() || null, type: input.type })
          .eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          profile_id: profileId,
          type: input.type,
          title: input.title.trim(),
          body: input.body.trim() || null,
          status: defaultStatusFor(input.type),
        })
        .select('id')
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEEDBACK_KEY }),
  });
}

export function useDeleteFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feedback').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEEDBACK_KEY }),
  });
}

export function useToggleVote() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: { feedbackId: string; voted: boolean }) => {
      if (!profileId) throw new Error('No profile');
      if (input.voted) {
        const { error } = await supabase
          .from('feedback_votes')
          .delete()
          .eq('feedback_id', input.feedbackId)
          .eq('profile_id', profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feedback_votes')
          .insert({ feedback_id: input.feedbackId, profile_id: profileId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FEEDBACK_KEY });
      qc.invalidateQueries({ queryKey: FEEDBACK_VOTES_KEY });
    },
  });
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: FeedbackStatus }) => {
      // .select() + checking returned rows is how we detect silent RLS blocks:
      // Supabase doesn't throw on UPDATE-rejected-by-RLS, it just returns 0 rows.
      // Without .select() we'd see "success" with nothing actually changed.
      const { data, error } = await supabase
        .from('feedback')
        .update({ status: input.status })
        .eq('id', input.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Update blocked (no permission or row not found)');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEEDBACK_KEY }),
  });
}

export function useFeedbackNotifications() {
  const { profileId } = useAuth();
  return useQuery({
    queryKey: [...FEEDBACK_NOTIF_KEY, profileId],
    enabled: Boolean(profileId),
    queryFn: async (): Promise<FeedbackNotification[]> => {
      const { data, error } = await supabase
        .from('feedback_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackNotification[];
    },
  });
}

export function useUnreadFeedbackCount(): number {
  const q = useFeedbackNotifications();
  return (q.data ?? []).filter((n) => n.read_at === null).length;
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!profileId) return;
      const { error } = await supabase
        .from('feedback_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEEDBACK_NOTIF_KEY }),
  });
}

/** Single feedback row by id. Re-uses list cache if available so detail navigation is instant. */
export function useFeedback(id: string | undefined) {
  return useQuery({
    queryKey: [...FEEDBACK_KEY, id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Feedback | null> => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as Feedback | null) ?? null;
    },
  });
}

export function useFeedbackComments(feedbackId: string | undefined) {
  return useQuery({
    queryKey: [...FEEDBACK_COMMENTS_KEY, feedbackId],
    enabled: Boolean(feedbackId),
    queryFn: async (): Promise<FeedbackComment[]> => {
      const { data, error } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('feedback_id', feedbackId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeedbackComment[];
    },
  });
}

/**
 * Resolve profile_id → name for a set of authors. Uses a security-definer RPC
 * because the `profiles` table's RLS hides everyone but the caller — the
 * feedback board is public, so we expose display names (only) via this RPC.
 */
export function useFeedbackAuthorNames(profileIds: string[]) {
  const sorted = [...new Set(profileIds)].sort();
  const key = sorted.join(',');
  return useQuery({
    queryKey: [...FEEDBACK_AUTHORS_KEY, key],
    enabled: sorted.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.rpc('feedback_author_names', {
        profile_ids: sorted,
      });
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of (data ?? []) as { profile_id: string; name: string }[]) {
        map.set(row.profile_id, row.name);
      }
      return map;
    },
  });
}

export function useAddFeedbackComment() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  return useMutation({
    mutationFn: async (input: { feedbackId: string; body: string }) => {
      if (!profileId) throw new Error('No profile');
      const body = input.body.trim();
      if (!body) throw new Error('Empty body');
      const { error } = await supabase
        .from('feedback_comments')
        .insert({ feedback_id: input.feedbackId, profile_id: profileId, body });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...FEEDBACK_COMMENTS_KEY, vars.feedbackId] });
    },
  });
}

export function useUpdateFeedbackComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: string; feedbackId: string }) => {
      const body = input.body.trim();
      if (!body) throw new Error('Empty body');
      // .select() detects silent RLS rejections (Supabase returns 0 rows instead of erroring).
      const { data, error } = await supabase
        .from('feedback_comments')
        .update({ body })
        .eq('id', input.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Update blocked (no permission)');
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...FEEDBACK_COMMENTS_KEY, vars.feedbackId] });
    },
  });
}

export function useDeleteFeedbackComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; feedbackId: string }) => {
      const { error } = await supabase.from('feedback_comments').delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [...FEEDBACK_COMMENTS_KEY, vars.feedbackId] });
    },
  });
}
