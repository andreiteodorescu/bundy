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
 * Read a header by name in a runtime-agnostic way. Vercel's Node runtime gives
 * a plain-object `req.headers` (lowercase keys), while Edge/Web runtimes give a
 * `Headers` instance with `.get()`.
 */
export function getHeader(req: unknown, name: string): string | null {
  const r = req as { headers?: unknown };
  const headers = r.headers;
  if (headers && typeof (headers as { get?: unknown }).get === 'function') {
    return (headers as { get: (n: string) => string | null }).get(name);
  }
  if (headers && typeof headers === 'object') {
    const value = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }
  return null;
}

/**
 * Parse the request body as JSON. Web Request exposes `.json()`; Node
 * IncomingMessage exposes a `Readable` stream we drain manually.
 */
export async function parseJsonBody<T>(req: unknown): Promise<T> {
  const r = req as { json?: () => Promise<T> } & NodeJS.ReadableStream;
  if (typeof r.json === 'function') {
    return r.json();
  }
  return new Promise<T>((resolve, reject) => {
    let raw = '';
    r.setEncoding?.('utf8');
    r.on('data', (chunk: string) => {
      raw += chunk;
    });
    r.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch (err) {
        reject(err as Error);
      }
    });
    r.on('error', reject);
  });
}

/**
 * Build a URL object from `req.url`. Node gives a path-only string; Web Request
 * gives a full URL. We pass a dummy base so path-only inputs parse correctly.
 */
export function getRequestUrl(req: unknown): URL {
  const r = req as { url?: string };
  const url = r.url ?? '/';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return new URL(url);
  }
  return new URL(url, 'http://localhost');
}

/**
 * Verify a Bearer JWT from the Authorization header, returning the user's profile_id.
 * Fails (returns null) if the token is invalid or the user has no profile membership.
 */
export async function verifyUserProfile(req: unknown): Promise<{
  userId: string;
  profileId: string;
} | null> {
  const auth = getHeader(req, 'authorization');
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

/**
 * Get the HTTP method in a runtime-agnostic way.
 */
export function getMethod(req: unknown): string {
  const r = req as { method?: string };
  return (r.method ?? 'GET').toUpperCase();
}
