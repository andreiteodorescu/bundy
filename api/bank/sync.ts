import { getMethod, getServiceClient, json, parseJsonBody, verifyUserProfile } from './_supabase.js';
import { syncConnection } from './_sync.js';

/**
 * POST /api/bank/sync  { connection_id }
 *
 * Manually triggers a sync for a single connection (the "Sync now" button in UI).
 * Verifies ownership, then runs the same sync logic the daily cron runs.
 */
export const config = { runtime: 'edge' };

export default async function handler(req: unknown): Promise<Response> {
  if (getMethod(req) !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = await verifyUserProfile(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: { connection_id?: string };
  try {
    body = await parseJsonBody<{ connection_id?: string }>(req);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body.connection_id) return json({ error: 'connection_id required' }, 400);

  const supabase = getServiceClient();
  const { data: connection } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', body.connection_id)
    .eq('profile_id', auth.profileId)
    .maybeSingle();

  if (!connection) return json({ error: 'Connection not found' }, 404);
  if (connection.status === 'disconnected') {
    return json({ error: 'Connection is disconnected' }, 409);
  }

  try {
    const stats = await syncConnection(supabase, connection, 14);
    return json({ ok: true, ...stats });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
