import { listProviders } from './_saltedge.js';
import { getRequestUrl, sendJson, verifyUserProfile } from './_supabase.js';

/**
 * GET /api/bank/institutions?country=RO
 *
 * Returns the list of banks (Salt Edge "providers") available for connection in
 * the requested country. Requires a valid Supabase Bearer token.
 *
 * Adapts the Salt Edge shape to a stable client-facing format:
 *   { id, name, bic?, logo, countries }
 *
 * Uses Node-style handler (req, res) because Salt Edge's WAF blocks Vercel
 * Edge-runtime egress (Cloudflare-to-Cloudflare bot filter). Node functions
 * egress from AWS IPs which pass through cleanly.
 */
export const config = { runtime: 'nodejs', maxDuration: 30 };

type NodeRes = {
  statusCode: number;
  setHeader: (k: string, v: string) => void;
  end: (b?: string) => void;
};

export default async function handler(req: unknown, res: NodeRes): Promise<void> {
  const t0 = Date.now();
  console.log('[bank/institutions] start');
  try {
    const auth = await verifyUserProfile(req);
    console.log('[bank/institutions] auth done in', Date.now() - t0, 'ms, ok:', Boolean(auth));
    if (!auth) return sendJson(res, { error: 'Unauthorized' }, 401);

    const url = getRequestUrl(req);
    const country = (url.searchParams.get('country') ?? 'RO').toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      return sendJson(res, { error: 'Invalid country code' }, 400);
    }

    const t1 = Date.now();
    console.log('[bank/institutions] calling Salt Edge providers for', country);
    const providers = await listProviders(country);
    console.log('[bank/institutions] Salt Edge returned', providers.length, 'providers in', Date.now() - t1, 'ms');

    const adapted = providers.map((p) => ({
      id: p.code,
      name: p.name,
      logo: p.logo_url ?? '',
      countries: [p.country_code],
      transaction_total_days: '90',
    }));
    sendJson(res, adapted, 200, {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[bank/institutions] failed after', Date.now() - t0, 'ms:', message);
    sendJson(res, { error: message }, 502);
  }
}
