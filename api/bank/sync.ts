import { getMethod, getServiceClient, parseJsonBody, sendJson, verifyUserProfile } from './_supabase.js';
import { syncConnection } from './_sync.js';

/**
 * POST /api/bank/sync  { connection_id }
 *
 * Manually triggers a sync for a single connection (the "Sync now" button in UI).
 * Verifies ownership, then runs the same sync logic the daily cron runs.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 };

type NodeRes = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (b?: string) => void;
};

export default async function handler(req: unknown, res: NodeRes): Promise<void> {
  if (getMethod(req) !== 'POST') return sendJson(res, { error: 'POST only' }, 405);
  const auth = await verifyUserProfile(req);
  if (!auth) return sendJson(res, { error: 'Unauthorized' }, 401);

  let body: { connection_id?: string };
  try {
    body = await parseJsonBody<{ connection_id?: string }>(req);
  } catch {
    return sendJson(res, { error: 'Invalid JSON' }, 400);
  }
  if (!body.connection_id) return sendJson(res, { error: 'connection_id required' }, 400);

  const supabase = getServiceClient();
  const { data: connection } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('id', body.connection_id)
    .eq('profile_id', auth.profileId)
    .maybeSingle();

  if (!connection) return sendJson(res, { error: 'Connection not found' }, 404);
  if (connection.status === 'disconnected') {
    return sendJson(res, { error: 'Connection is disconnected' }, 409);
  }

  try {
    const stats = await syncConnection(supabase, connection, 14);
    sendJson(res, { ok: true, ...stats });
  } catch (err) {
    sendJson(res, { error: (err as Error).message }, 502);
  }
}
