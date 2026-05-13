import { getMethod, getServiceClient, json, parseJsonBody } from './_supabase.js';
import { syncConnection } from './_sync.js';

/**
 * POST /api/bank/saltedge-webhook
 *
 * Receives Salt Edge callback notifications:
 *   - "success": new transactions are available → run sync
 *   - "destroy": user revoked connection at provider → mark as disconnected
 *   - "fail": connection moved to error state
 *
 * Webhook payload shape (v6):
 *   {
 *     "meta": { "version": "6.0", "time": "..." },
 *     "data": {
 *       "connection_id": "...",
 *       "customer_id": "...",
 *       "stage": "finish" | "interactive" | ...,
 *       "custom_fields": {...}
 *     }
 *   }
 *
 * Signature verification: Salt Edge signs webhooks with the app's RSA private
 * key. For sandbox we accept unsigned (Salt Edge sandbox doesn't sign). We'll
 * add HMAC verification with the production cert once we go live.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 };

type SaltEdgeWebhookPayload = {
  meta?: { version?: string; time?: string };
  data?: {
    connection_id?: string;
    customer_id?: string;
    stage?: string;
    custom_fields?: Record<string, unknown>;
  };
};

export default async function handler(req: unknown): Promise<Response> {
  if (getMethod(req) !== 'POST') return json({ error: 'POST only' }, 405);

  let body: SaltEdgeWebhookPayload;
  try {
    body = await parseJsonBody<SaltEdgeWebhookPayload>(req);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const connectionId = body.data?.connection_id;
  if (!connectionId) return json({ ok: true, skipped: 'no connection_id' });

  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('provider', 'saltedge')
    .eq('provider_requisition_id', connectionId)
    .maybeSingle();

  if (!row) {
    // First-touch flow already handled by /api/bank/callback. If a webhook fires
    // before our callback persists the row, just ack — the user will trigger a
    // sync soon enough.
    return json({ ok: true, skipped: 'connection not yet persisted' });
  }

  try {
    const stats = await syncConnection(supabase, row, 14);
    return json({ ok: true, ...stats });
  } catch (err) {
    return json({ ok: false, error: (err as Error).message }, 502);
  }
}
