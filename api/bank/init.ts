import { createConnectSession, createCustomer, findCustomerByIdentifier } from './_saltedge';
import { getServiceClient, json, verifyUserProfile } from './_supabase';

/**
 * POST /api/bank/init  { institution_id, redirect_origin, institution_name? }
 *
 * Starts a Salt Edge connect session. Creates a Salt Edge customer for the
 * profile on first use (stored on profiles.saltedge_customer_id), then opens
 * a connect session and returns the `connect_url` the user visits to authorize
 * at their bank. After they finish, Salt Edge redirects them back to
 * /bank/callback?ref=<reference>&status=success.
 *
 * Stores a `bank_pending_requisitions` row keyed by our reference so the
 * callback can match it back to the profile + provider_code.
 */
export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const auth = await verifyUserProfile(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body: {
    institution_id?: string;
    institution_name?: string;
    redirect_origin?: string;
    language?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { institution_id, institution_name, redirect_origin } = body;
  if (!institution_id || !redirect_origin) {
    return json({ error: 'institution_id and redirect_origin required' }, 400);
  }

  const allowedOrigins = new Set([
    'https://bundy.ro',
    'https://www.bundy.ro',
    'http://localhost:5173',
  ]);
  if (!allowedOrigins.has(redirect_origin)) {
    return json({ error: 'redirect_origin not allowed' }, 400);
  }

  const reference = `${auth.profileId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const returnTo = `${redirect_origin}/bank/callback?ref=${encodeURIComponent(reference)}`;
  const supabase = getServiceClient();

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('saltedge_customer_id')
      .eq('id', auth.profileId)
      .maybeSingle();

    let customerId = profile?.saltedge_customer_id as string | null;
    if (!customerId) {
      // Salt Edge identifiers must be unique per app. Use the profile UUID.
      const existing = await findCustomerByIdentifier(auth.profileId);
      const customer = existing ?? (await createCustomer(auth.profileId));
      customerId = customer.id;
      await supabase
        .from('profiles')
        .update({ saltedge_customer_id: customerId })
        .eq('id', auth.profileId);
    }

    const session = await createConnectSession({
      customerId,
      providerCode: institution_id,
      returnTo,
    });

    await supabase.from('bank_pending_requisitions').insert({
      reference,
      profile_id: auth.profileId,
      // Reusing existing columns: requisition_id stores the connect session expiry
      // (used purely as a marker — the actual lookup is by reference + customer).
      requisition_id: session.expires_at,
      institution_id,
      institution_name: institution_name ?? institution_id,
    });

    return json({ link: session.connect_url, reference });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
