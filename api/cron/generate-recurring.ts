import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

/**
 * Daily cron — materializes subscription + loan expenses across ALL profiles for any
 * charge dates between (today − 30d) and today that aren't already in `expenses`.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (cron has no logged-in user).
 * Idempotent via the partial unique indices on expenses(profile_id, source_ref_id, occurred_on).
 *
 * Runs in parallel to the client-side generator at app boot — neither duplicates because
 * of the unique indices, but the cron means recurring expenses are visible *before* the
 * user reopens the app (e.g. on /home banners or /expenses totals).
 *
 * Triggered by Vercel Cron (config in vercel.json). Auth via CRON_SECRET env var.
 */

export const config = { runtime: 'nodejs', maxDuration: 60 };

type Subscription = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: string;
  cadence: 'weekly' | 'monthly' | 'yearly';
  charge_day: number;
  charge_month: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[] | null;
  active: boolean;
  start_date: string;
  end_date: string | null;
};

type Loan = {
  id: string;
  profile_id: string;
  name: string;
  bank: string | null;
  monthly_payment: number;
  currency: string;
  charge_day: number;
  start_date: string;
  end_date: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[] | null;
  active: boolean;
  note: string | null;
};

type FxRow = { date: string; currency: string; rate_to_ron: number };

const WINDOW_DAYS = 30;
const SUPPORTED_CURRENCIES = new Set(['EUR', 'USD']);

export default async function handler(req: Request): Promise<Response> {
  // Auth — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Reject anyone else.
  const auth = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error: 'Missing Supabase env vars' }, 500);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const today = ymd(new Date());
  const windowStart = ymd(addDays(new Date(), -WINDOW_DAYS));

  try {
    const subStats = await runSubscriptions(supabase, windowStart, today);
    const loanStats = await runLoans(supabase, windowStart, today);
    return json({
      ok: true,
      ranAt: new Date().toISOString(),
      window: { start: windowStart, end: today },
      subscriptions: subStats,
      loans: loanStats,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
}

// ─── subscriptions ──────────────────────────────────────────────────────────────

async function runSubscriptions(
  supabase: SupabaseClient,
  start: string,
  end: string,
): Promise<{ created: number; skipped: number; errors: number }> {
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('active', true);
  if (error) throw new Error(`subscriptions fetch: ${error.message}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of (subs ?? []) as Subscription[]) {
    const dates = subscriptionChargeDates(sub, start, end);
    for (const date of dates) {
      // Idempotency check before insert (the unique index would also catch dupes)
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('profile_id', sub.profile_id)
        .eq('source', 'subscription')
        .eq('source_ref_id', sub.id)
        .eq('occurred_on', date)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      const fx = await resolveAmountRon(supabase, Number(sub.amount), sub.currency, date);
      if (!fx) {
        errors++;
        continue;
      }

      const { error: insertErr } = await supabase.from('expenses').insert({
        profile_id: sub.profile_id,
        name: sub.name,
        amount_original: sub.amount,
        currency_original: sub.currency,
        amount_ron: fx.amountRon,
        fx_rate: fx.rate,
        fx_rate_date: fx.rateDate,
        occurred_on: date,
        category_id: sub.category_id,
        subcategory_id: sub.subcategory_id,
        tags: sub.tags ?? [],
        source: 'subscription',
        source_ref_id: sub.id,
        note: null,
      });
      if (insertErr) errors++;
      else created++;
    }
  }
  return { created, skipped, errors };
}

function subscriptionChargeDates(sub: Subscription, windowStart: string, windowEnd: string): string[] {
  const startBound = pickLater(sub.start_date, windowStart);
  const endBound = sub.end_date ? pickEarlier(sub.end_date, windowEnd) : windowEnd;
  if (startBound > endBound) return [];

  const out: string[] = [];

  if (sub.cadence === 'weekly') {
    // ISO weekday: 1=Mon..7=Sun
    let cur = new Date(startBound + 'T00:00:00Z');
    const last = new Date(endBound + 'T00:00:00Z');
    while (cur.getTime() <= last.getTime()) {
      const isoDow = ((cur.getUTCDay() + 6) % 7) + 1;
      if (isoDow === sub.charge_day) out.push(ymd(cur));
      cur = addDays(cur, 1);
    }
    return out;
  }

  // monthly / yearly: walk months between bounds, clamp day to month length
  const startD = parseYmd(startBound);
  const endD = parseYmd(endBound);
  let y = startD.getUTCFullYear();
  let m = startD.getUTCMonth(); // 0..11
  while (y < endD.getUTCFullYear() || (y === endD.getUTCFullYear() && m <= endD.getUTCMonth())) {
    if (sub.cadence === 'yearly' && sub.charge_month && m + 1 !== sub.charge_month) {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
      continue;
    }
    const dim = daysInMonth(y, m);
    const day = Math.min(sub.charge_day, dim);
    const candidate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (candidate >= startBound && candidate <= endBound) out.push(candidate);
    if (sub.cadence === 'yearly') {
      y++;
    } else {
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
  }
  return out;
}

// ─── loans ───────────────────────────────────────────────────────────────────────

async function runLoans(
  supabase: SupabaseClient,
  start: string,
  end: string,
): Promise<{ created: number; skipped: number; errors: number }> {
  const { data: loans, error } = await supabase.from('loans').select('*').eq('active', true);
  if (error) throw new Error(`loans fetch: ${error.message}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const loan of (loans ?? []) as Loan[]) {
    const dates = loanChargeDates(loan, start, end);
    for (const date of dates) {
      const { data: existing } = await supabase
        .from('expenses')
        .select('id')
        .eq('profile_id', loan.profile_id)
        .eq('source', 'loan')
        .eq('source_ref_id', loan.id)
        .eq('occurred_on', date)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }

      const fx = await resolveAmountRon(supabase, Number(loan.monthly_payment), loan.currency, date);
      if (!fx) {
        errors++;
        continue;
      }

      const tags = ['loan', ...(loan.tags ?? []).filter((t) => t !== 'loan')];
      const { error: insertErr } = await supabase.from('expenses').insert({
        profile_id: loan.profile_id,
        name: loan.bank ? `${loan.name} (${loan.bank})` : loan.name,
        amount_original: loan.monthly_payment,
        currency_original: loan.currency,
        amount_ron: fx.amountRon,
        fx_rate: fx.rate,
        fx_rate_date: fx.rateDate,
        occurred_on: date,
        category_id: loan.category_id,
        subcategory_id: loan.subcategory_id,
        tags,
        source: 'loan',
        source_ref_id: loan.id,
        note: loan.note,
      });
      if (insertErr) errors++;
      else created++;
    }
  }
  return { created, skipped, errors };
}

function loanChargeDates(loan: Loan, windowStart: string, windowEnd: string): string[] {
  const startBound = pickLater(loan.start_date, windowStart);
  const endBound = loan.end_date ? pickEarlier(loan.end_date, windowEnd) : windowEnd;
  if (startBound > endBound) return [];
  const out: string[] = [];
  const startD = parseYmd(startBound);
  const endD = parseYmd(endBound);
  let y = startD.getUTCFullYear();
  let m = startD.getUTCMonth();
  while (y < endD.getUTCFullYear() || (y === endD.getUTCFullYear() && m <= endD.getUTCMonth())) {
    const dim = daysInMonth(y, m);
    const day = Math.min(loan.charge_day, dim);
    const candidate = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (candidate >= startBound && candidate <= endBound) out.push(candidate);
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  return out;
}

// ─── FX (BNR) ────────────────────────────────────────────────────────────────────

async function resolveAmountRon(
  supabase: SupabaseClient,
  amount: number,
  currency: string,
  date: string,
): Promise<{ amountRon: number; rate: number | null; rateDate: string | null } | null> {
  if (currency === 'RON') return { amountRon: round2(amount), rate: null, rateDate: null };
  if (!SUPPORTED_CURRENCIES.has(currency)) return null;

  // Try cache first
  const cached = await supabase
    .from('fx_rates')
    .select('date, currency, rate_to_ron')
    .eq('currency', currency)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cached.data) {
    const rate = Number(cached.data.rate_to_ron);
    return { amountRon: round2(amount * rate), rate, rateDate: cached.data.date };
  }

  // Cache miss — fetch from BNR XML and upsert
  try {
    const year = date.slice(0, 4);
    const xml = await fetchBnrYear(year);
    const rates = parseBnrXml(xml, currency);
    if (rates.length === 0) return null;
    rates.sort((a, b) => (a.date < b.date ? -1 : 1));
    const usable = [...rates].reverse().find((r) => r.date <= date);
    if (!usable) return null;
    await supabase.from('fx_rates').upsert(rates, { onConflict: 'date,currency' });
    return { amountRon: round2(amount * usable.rate_to_ron), rate: usable.rate_to_ron, rateDate: usable.date };
  } catch {
    return null;
  }
}

async function fetchBnrYear(year: string): Promise<string> {
  const res = await fetch(`https://bnr.ro/files/xml/years/nbrfxrates${year}.xml`, {
    headers: { Accept: 'application/xml,text/xml' },
  });
  if (!res.ok) throw new Error(`BNR XML fetch failed: ${res.status}`);
  return res.text();
}

function parseBnrXml(xml: string, currency: string): FxRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    parseAttributeValue: true,
  });
  const tree = parser.parse(xml);
  const cubes = tree?.DataSet?.Body?.Cube ?? [];
  const list: FxRow[] = [];
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

// ─── small utilities ────────────────────────────────────────────────────────────

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function pickLater(a: string, b: string): string {
  return a > b ? a : b;
}

function pickEarlier(a: string, b: string): string {
  return a < b ? a : b;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
