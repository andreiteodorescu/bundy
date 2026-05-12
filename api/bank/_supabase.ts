import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service role Supabase client — bypasses RLS. Use only in server functions where the
 * user identity is verified separately (via JWT verification below).
 */
export function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Verify a Bearer JWT from the Authorization header, returning the user's profile_id.
 * Fails (returns null) if the token is invalid or the user has no profile membership.
 */
export async function verifyUserProfile(req: Request): Promise<{
  userId: string;
  profileId: string;
} | null> {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const supabase = getServiceClient();
  const { data: userRes } = await supabase.auth.getUser(token);
  if (!userRes.user) return null;

  const { data: membership } = await supabase
    .from('profile_members')
    .select('profile_id')
    .eq('user_id', userRes.user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  return { userId: userRes.user.id, profileId: membership.profile_id };
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
