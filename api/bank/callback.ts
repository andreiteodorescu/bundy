import { getConnection, listAccounts, listConnections } from './_saltedge.js';
import { getMethod, getServiceClient, parseJsonBody, sendJson, verifyUserProfile } from './_supabase.js';
import { syncConnection } from './_sync.js';

/**
 * POST /api/bank/callback  { reference }
 *
 * Called by BankCallbackPage after the user returns from the bank's auth flow.
 * Looks up the pending row by reference, fetches the customer's connections from
 * Salt Edge, picks the newest one (created after the pending row), enumerates
 * its accounts, persists bank_connections rows, and triggers an initial sync.
 *
 * We don't trust the URL params alone — the reference must match a pending row
 * owned by the authenticated profile.
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

  let body: { reference?: string };
  try {
    body = await parseJsonBody<{ reference?: string }>(req);
  } catch {
    return sendJson(res, { error: 'Invalid JSON' }, 400);
  }

  if (!body.reference) return sendJson(res, { error: 'reference required' }, 400);

  const supabase = getServiceClient();

  const { data: pending } = await supabase
    .from('bank_pending_requisitions')
    .select('*')
    .eq('reference', body.reference)
    .eq('profile_id', auth.profileId)
    .maybeSingle();

  if (!pending) return sendJson(res, { error: 'Pending requisition not found' }, 404);

  const { data: profile } = await supabase
    .from('profiles')
    .select('saltedge_customer_id')
    .eq('id', auth.profileId)
    .maybeSingle();

  const customerId = profile?.saltedge_customer_id as string | null;
  if (!customerId) return sendJson(res, { error: 'No Salt Edge customer for profile' }, 404);

  // Pick the connection created after we initiated the pending row. Salt Edge
  // returns connections newest-first; we filter by provider_code + created_at to
  // avoid picking up an unrelated reconnection from another tab.
  let connection;
  try {
    const connections = await listConnections(customerId);
    const pendingCreatedAt = new Date(pending.created_at).getTime();
    connection = connections
      .filter((c) => c.provider_code === pending.institution_id)
      .find((c) => new Date(c.created_at).getTime() >= pendingCreatedAt - 60_000);
    if (!connection) {
      return sendJson(res, { error: 'No matching connection found yet — try again in a few seconds' }, 409);
    }
    connection = await getConnection(connection.id);
  } catch (err) {
    return sendJson(res, { error: (err as Error).message }, 502);
  }

  if (connection.status === 'disabled') {
    return sendJson(res, { error: 'Connection is disabled at the provider' }, 409);
  }

  let accounts;
  try {
    accounts = await listAccounts(connection.id);
  } catch (err) {
    return sendJson(res, { error: (err as Error).message }, 502);
  }

  if (accounts.length === 0) {
    return sendJson(res, { error: 'No accounts linked to connection' }, 400);
  }

  // PSD2: AIS consent must be refreshed every 90 days. We surface the date so
  // the UI can prompt re-consent before it expires.
  const consentExpiresAt = new Date();
  consentExpiresAt.setDate(consentExpiresAt.getDate() + 90);

  const created: string[] = [];
  const syncStats: Array<{ connectionId: string; imported: number; pending: number }> = [];

  for (const account of accounts) {
    const { data: row, error: connErr } = await supabase
      .from('bank_connections')
      .upsert(
        {
          profile_id: auth.profileId,
          provider: 'saltedge',
          provider_requisition_id: connection.id,
          provider_account_id: account.id,
          institution_id: pending.institution_id,
          institution_name: pending.institution_name ?? connection.provider_name,
          iban: account.extra?.iban ?? null,
          status: 'active',
          consent_expires_at: consentExpiresAt.toISOString(),
        },
        { onConflict: 'provider,provider_account_id' },
      )
      .select('*')
      .single();

    if (connErr || !row) continue;
    created.push(row.id);

    try {
      const stats = await syncConnection(supabase, row, 30);
      syncStats.push({
        connectionId: row.id,
        imported: stats.imported,
        pending: stats.pending,
      });
    } catch {
      // Initial sync failure is non-fatal; user can re-trigger from UI.
    }
  }

  await supabase.from('bank_pending_requisitions').delete().eq('reference', body.reference);

  sendJson(res, { ok: true, created_count: created.length, sync_stats: syncStats });
}
