import { createAgreement, createRequisition } from './_gocardless';
import { getServiceClient, json, verifyUserProfile } from './_supabase';

/**
 * POST /api/bank/init  { institution_id, redirect_origin, language? }
 *
 * Starts a GoCardless requisition flow. Returns the link the user needs to visit
 * to authorize at their bank. After they finish there, GoCardless redirects them
 * back to our /bank/callback?ref=<requisition_id>.
 *
 * Stores a `pending_requisition` row keyed by the reference so we can match it up
 * on callback (avoids users tampering with the requisition_id in the URL).
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

  // Whitelist allowed redirect origins to prevent open-redirect abuse.
  const allowedOrigins = new Set([
    'https://bundy.ro',
    'https://www.bundy.ro',
    'http://localhost:5173',
  ]);
  if (!allowedOrigins.has(redirect_origin)) {
    return json({ error: 'redirect_origin not allowed' }, 400);
  }

  const reference = `${auth.profileId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const redirectUrl = `${redirect_origin}/bank/callback`;

  try {
    const agreement = await createAgreement(institution_id);
    const requisition = await createRequisition({
      institutionId: institution_id,
      redirectUrl,
      reference,
      agreementId: agreement.id,
      userLanguage: (body.language ?? 'EN').toUpperCase(),
    });

    // Store pending requisition so the callback can verify ownership.
    const supabase = getServiceClient();
    await supabase.from('bank_pending_requisitions').insert({
      reference,
      profile_id: auth.profileId,
      requisition_id: requisition.id,
      institution_id,
      institution_name: institution_name ?? institution_id,
    });

    return json({ link: requisition.link, requisition_id: requisition.id, reference });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
