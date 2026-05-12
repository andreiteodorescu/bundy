import { getAccountDetails, getRequisition } from './_gocardless';
import { getServiceClient, json, verifyUserProfile } from './_supabase';
import { syncConnection } from './_sync';

/**
 * POST /api/bank/callback  { reference }
 *
 * Called by the BankCallbackPage after the user returns from the bank's auth flow.
 * Looks up the pending requisition, fetches the linked accounts from GoCardless,
 * creates `bank_connections` rows, and triggers an initial sync.
 *
 * We don't trust the `reference` from the URL alone — we verify the user owns the
 * pending requisition before doing anything.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = await verifyUserProfile(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: { reference?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!body.reference) return json({ error: 'reference required' }, 400);

  const supabase = getServiceClient();

  const { data: pending } = await supabase
    .from('bank_pending_requisitions')
    .select('*')
    .eq('reference', body.reference)
    .eq('profile_id', auth.profileId)
    .maybeSingle();

  if (!pending) return json({ error: 'Pending requisition not found' }, 404);

  let requisition;
  try {
    requisition = await getRequisition(pending.requisition_id);
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }

  if (requisition.status !== 'LN') {
    return json({ error: `Requisition not linked yet (status=${requisition.status})` }, 409);
  }

  if (requisition.accounts.length === 0) {
    return json({ error: 'No accounts linked to requisition' }, 400);
  }

  // Compute consent expiry (90 days from now — PSD2 max).
  const consentExpiresAt = new Date();
  consentExpiresAt.setDate(consentExpiresAt.getDate() + 90);

  const created: string[] = [];
  const syncStats: Array<{ connectionId: string; imported: number; pending: number }> = [];

  for (const accountId of requisition.accounts) {
    let details;
    try {
      details = await getAccountDetails(accountId);
    } catch {
      details = { resourceId: accountId, currency: 'RON' };
    }

    const { data: connection, error: connErr } = await supabase
      .from('bank_connections')
      .upsert(
        {
          profile_id: auth.profileId,
          provider: 'gocardless',
          provider_requisition_id: pending.requisition_id,
          provider_account_id: accountId,
          institution_id: pending.institution_id,
          institution_name: pending.institution_name ?? pending.institution_id,
          iban: details.iban ?? null,
          status: 'active',
          consent_expires_at: consentExpiresAt.toISOString(),
        },
        { onConflict: 'provider,provider_account_id' },
      )
      .select('*')
      .single();

    if (connErr || !connection) continue;
    created.push(connection.id);

    try {
      const stats = await syncConnection(supabase, connection, 30);
      syncStats.push({
        connectionId: connection.id,
        imported: stats.imported,
        pending: stats.pending,
      });
    } catch {
      // Initial sync failure is non-fatal; user can re-trigger from UI.
    }
  }

  // Cleanup the pending requisition row (we don't need it anymore).
  await supabase.from('bank_pending_requisitions').delete().eq('reference', body.reference);

  return json({ ok: true, created_count: created.length, sync_stats: syncStats });
}
