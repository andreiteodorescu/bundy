import { listInstitutions } from './_gocardless';
import { json, verifyUserProfile } from './_supabase';

/**
 * GET /api/bank/institutions?country=RO
 *
 * Returns the list of banks available for connection in the requested country.
 * Requires a valid Supabase Bearer token (any logged-in user can list institutions).
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
    const banks = await listInstitutions(country);
    return json(banks, 200, {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
