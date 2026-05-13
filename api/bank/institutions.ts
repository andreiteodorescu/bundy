import { listProviders } from './_saltedge';
import { json, verifyUserProfile } from './_supabase';

/**
 * GET /api/bank/institutions?country=RO
 *
 * Returns the list of banks (Salt Edge "providers") available for connection in
 * the requested country. Requires a valid Supabase Bearer token.
 *
 * Adapts the Salt Edge shape to a stable client-facing format:
 *   { id, name, bic?, logo, countries }
 */
export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  const auth = await verifyUserProfile(req);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const country = (url.searchParams.get('country') ?? 'RO').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return json({ error: 'Invalid country code' }, 400);
  }

  try {
    const providers = await listProviders(country);
    const adapted = providers.map((p) => ({
      id: p.code,
      name: p.name,
      logo: p.logo_url ?? '',
      countries: [p.country_code],
      transaction_total_days: '90',
    }));
    return json(adapted, 200, {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
