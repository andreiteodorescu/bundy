import { getServiceClient, json } from '../bank/_supabase';
import { syncConnection } from '../bank/_sync';

/**
 * Daily cron — sync all active bank connections for all profiles. Mirrors the
 * existing generate-recurring cron pattern (auth via CRON_SECRET, service role
 * client).
 *
 * Marks expired consents (consent_expires_at < now) as `expired` so the user gets
 * prompted to reconnect.
 *
 * Schedule (vercel.json): `30 0 * * *` — 00:30 UTC daily, 15min after the
 * recurring-expense cron so they don't compete for the same FX rate fetches.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabase = getServiceClient();

  // Mark expired consents.
  const nowIso = new Date().toISOString();
  await supabase
    .from('bank_connections')
    .update({ status: 'expired' })
    .lt('consent_expires_at', nowIso)
    .eq('status', 'active');

  const { data: connections, error } = await supabase
    .from('bank_connections')
    .select('*')
    .eq('status', 'active');
  if (error) return json({ error: error.message }, 500);

  const results: Array<{
    connectionId: string;
    profileId: string;
    fetched?: number;
    imported?: number;
    pending?: number;
    error?: string;
  }> = [];

  for (const c of connections ?? []) {
    try {
      const stats = await syncConnection(supabase, c, 14);
      results.push({
        connectionId: c.id,
        profileId: c.profile_id,
        fetched: stats.fetched,
        imported: stats.imported,
        pending: stats.pending,
      });
    } catch (err) {
      results.push({
        connectionId: c.id,
        profileId: c.profile_id,
        error: (err as Error).message,
      });
    }
  }

  return json({ ok: true, ranAt: nowIso, count: results.length, results });
}
