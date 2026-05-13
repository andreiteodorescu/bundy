import { getMethod, getServiceClient, parseJsonBody, sendJson } from './_supabase.js';
import { syncConnection } from './_sync.js';

/**
 * POST /api/bank/saltedge-webhook
 *
 * Receives Salt Edge callback notifications (new transactions, consent change,
 * connection destroyed). When a known connection_id arrives we run a sync;
 * otherwise we just ack (first-touch is handled by /api/bank/callback).
 *
 * Signature verification: Salt Edge signs webhooks with the app's RSA private
 * key. Sandbox doesn't sign — we'll add HMAC verification when going live.
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

type NodeRes = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (b?: string) => void;
};

export default async function handler(req: unknown, res: NodeRes): Promise<void> {
  if (getMethod(req) !== 'POST') return sendJson(res, { error: 'POST only' }, 405);

  let body: SaltEdgeWebhookPayload;
  try {
    body = await parseJsonBody<SaltEdgeWebhookPayload>(req);
  } catch {
    return sendJson(res, { error: 'Invalid JSON' }, 400);
  }

  const connectionId = body.data?.connection_id;
  if (!connectionId) return sendJson(res, { ok: true, skipped: 'no connection_id' });

  const supabase = getServiceClient();

  const { data: row } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('provider', 'saltedge')
    .eq('provider_requisition_id', connectionId)
    .maybeSingle();

  if (!row) {
    return sendJson(res, { ok: true, skipped: 'connection not yet persisted' });
  }

  try {
    const stats = await syncConnection(supabase, row, 14);
    sendJson(res, { ok: true, ...stats });
  } catch (err) {
    sendJson(res, { ok: false, error: (err as Error).message }, 502);
  }
}
