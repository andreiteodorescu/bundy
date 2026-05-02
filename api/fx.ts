import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/fx?date=YYYY-MM-DD&currency=EUR
 *
 * Proxies BNR exchange rate XML (CORS-blocked from browsers) and caches results in
 * Supabase `fx_rates` so subsequent requests bypass BNR.
 *
 * If the requested date is a non-business day, falls back to the most recent prior
 * business day for which BNR has published a rate.
 */
export const config = { runtime: 'nodejs' };

const SUPPORTED = new Set(['EUR', 'USD']);

type RateRow = { date: string; currency: string; rate_to_ron: number };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const currency = url.searchParams.get('currency')?.toUpperCase();

  if (!date || !currency || !SUPPORTED.has(currency)) {
    return json({ error: 'Provide ?date=YYYY-MM-DD&currency=EUR|USD' }, 400);
  }

  const year = date.slice(0, 4);
  const xml = await fetchYearXml(year);
  const rates = parseBnrXml(xml, currency);
  if (rates.length === 0) {
    return json({ error: `No ${currency} rates in BNR ${year} XML` }, 502);
  }

  // Find the most recent rate on or before `date`
  const sorted = rates.sort((a, b) => (a.date < b.date ? -1 : 1));
  const usable = [...sorted].reverse().find((r) => r.date <= date);
  if (!usable) {
    return json({ error: `No BNR rate available on or before ${date} in ${year}` }, 404);
  }

  await upsertRates(rates);

  return json(usable, 200, {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  });
}

async function fetchYearXml(year: string): Promise<string> {
  const res = await fetch(`https://bnr.ro/files/xml/years/nbrfxrates${year}.xml`, {
    headers: { Accept: 'application/xml,text/xml' },
  });
  if (!res.ok) throw new Error(`BNR XML fetch failed: ${res.status}`);
  return res.text();
}

function parseBnrXml(xml: string, currency: string): RateRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });
  const tree = parser.parse(xml);
  // Structure: DataSet > Body > Cube[*] (each Cube has @date and Rate[*] with @currency)
  const cubes = tree?.DataSet?.Body?.Cube ?? [];
  const list: RateRow[] = [];
  for (const cube of Array.isArray(cubes) ? cubes : [cubes]) {
    const cubeDate = String(cube.date);
    const items = Array.isArray(cube.Rate) ? cube.Rate : [cube.Rate];
    for (const it of items) {
      if (!it) continue;
      if (String(it.currency).toUpperCase() === currency) {
        const multiplier = Number(it.multiplier ?? 1);
        const value = Number(typeof it === 'object' && '#text' in it ? it['#text'] : it);
        if (!Number.isFinite(value) || multiplier <= 0) continue;
        list.push({ date: cubeDate, currency, rate_to_ron: value / multiplier });
      }
    }
  }
  return list;
}

async function upsertRates(rates: RateRow[]) {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  await supabase.from('fx_rates').upsert(rates, { onConflict: 'date,currency' });
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
