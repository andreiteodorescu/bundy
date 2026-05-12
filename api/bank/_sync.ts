import type { SupabaseClient } from '@supabase/supabase-js';
import { extractMerchantText, getTransactions } from './_gocardless';

export const config = { runtime: 'nodejs' };

const SUPPORTED_FX = new Set(['EUR', 'USD']);

type BankConnection = {
  id: string;
  profile_id: string;
  provider_account_id: string;
  status: string;
  last_synced_at: string | null;
};

type BankImportRule = {
  id: string;
  profile_id: string;
  keywords: string[];
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[];
  priority: number;
  enabled: boolean;
};

/**
 * Pull recent transactions from a single bank connection, apply matching rules, and
 * either insert as expense (if matched) or as `bank_transactions` with status
 * `pending_review` (if no rule matches).
 *
 * Idempotent — the unique index on (connection_id, provider_transaction_id) prevents
 * duplicate inserts when the same window is re-synced.
 *
 * Returns counts so callers (manual sync button, daily cron) can show feedback.
 */
export async function syncConnection(
  supabase: SupabaseClient,
  connection: BankConnection,
  windowDays = 14,
): Promise<{
  fetched: number;
  imported: number;
  pending: number;
  skipped: number;
  errors: number;
}> {
  const dateFrom = ymd(addDays(new Date(), -windowDays));
  const dateTo = ymd(new Date());

  const { data: rulesData } = await supabase
    .from('bank_import_rules')
    .select('*')
    .eq('profile_id', connection.profile_id)
    .eq('enabled', true);
  const rules = (rulesData ?? []) as BankImportRule[];

  let res;
  try {
    res = await getTransactions(connection.provider_account_id, dateFrom, dateTo);
  } catch (err) {
    await supabase
      .from('bank_connections')
      .update({
        last_sync_error: (err as Error).message.slice(0, 500),
        status: 'error',
      })
      .eq('id', connection.id);
    throw err;
  }

  const booked = res.transactions.booked ?? [];
  let imported = 0;
  let pending = 0;
  let skipped = 0;
  let errors = 0;

  for (const tx of booked) {
    const providerTxId = tx.transactionId ?? tx.internalTransactionId;
    if (!providerTxId) {
      errors++;
      continue;
    }

    // Idempotency: skip if we've already processed this transaction.
    const { data: existing } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('connection_id', connection.id)
      .eq('provider_transaction_id', providerTxId)
      .maybeSingle();
    if (existing) {
      skipped++;
      continue;
    }

    // GoCardless reports debits as negative amounts. We're tracking expenses, so flip
    // the sign and skip credits (incoming money).
    const rawAmount = Number(tx.transactionAmount.amount);
    if (rawAmount >= 0) {
      // Incoming money — for now we ignore (savings/investments are handled separately).
      // Insert anyway so the user can see it in pending_review if they want.
      skipped++;
      continue;
    }
    const amount = Math.abs(rawAmount);
    const currency = tx.transactionAmount.currency;
    const occurredOn = tx.bookingDate ?? tx.valueDate ?? tx.bookingDateTime?.slice(0, 10);
    if (!occurredOn) {
      errors++;
      continue;
    }

    const { merchantName, description } = extractMerchantText(tx);

    // Try to match a rule.
    const matched = matchRule(merchantName, description, rules);

    if (!matched) {
      // No rule → save raw transaction in pending_review bucket, no expense created.
      const { error: insertErr } = await supabase.from('bank_transactions').insert({
        profile_id: connection.profile_id,
        connection_id: connection.id,
        provider_transaction_id: providerTxId,
        booked: true,
        amount,
        currency,
        merchant_name: merchantName || null,
        description: description || null,
        occurred_on: occurredOn,
        raw: tx as unknown as Record<string, unknown>,
        status: 'pending_review',
      });
      if (insertErr) errors++;
      else pending++;
      continue;
    }

    // Matched → resolve FX, create expense, link bank_transaction.
    const fx = await resolveAmountRon(supabase, amount, currency, occurredOn);
    if (!fx) {
      errors++;
      continue;
    }

    const tags = uniqueTags(['from-bank', ...(matched.rule.tags ?? [])]);

    const { data: expenseRow, error: expenseErr } = await supabase
      .from('expenses')
      .insert({
        profile_id: connection.profile_id,
        name: merchantName || matched.matched_keyword,
        amount_original: amount,
        currency_original: currency,
        amount_ron: fx.amount_ron,
        fx_rate: fx.rate,
        fx_rate_date: fx.rate_date,
        occurred_on: occurredOn,
        category_id: matched.rule.category_id,
        subcategory_id: matched.rule.subcategory_id,
        tags,
        source: 'manual',
        note: description || null,
      })
      .select('id')
      .single();

    if (expenseErr || !expenseRow) {
      errors++;
      continue;
    }

    const { error: txInsertErr } = await supabase.from('bank_transactions').insert({
      profile_id: connection.profile_id,
      connection_id: connection.id,
      provider_transaction_id: providerTxId,
      booked: true,
      amount,
      currency,
      merchant_name: merchantName || null,
      description: description || null,
      occurred_on: occurredOn,
      raw: tx as unknown as Record<string, unknown>,
      matched_rule_id: matched.rule.id,
      expense_id: expenseRow.id,
      status: 'imported',
    });
    if (txInsertErr) {
      // Cleanup: roll back the expense if we couldn't link the bank_transaction
      await supabase.from('expenses').delete().eq('id', expenseRow.id);
      errors++;
    } else {
      imported++;
    }
  }

  await supabase
    .from('bank_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      status: 'active',
    })
    .eq('id', connection.id);

  return { fetched: booked.length, imported, pending, skipped, errors };
}

// ─── helpers (kept here so this file is self-contained for Vercel functions) ────

function normalizeMerchant(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchRule(
  merchantName: string,
  description: string,
  rules: BankImportRule[],
): { rule: BankImportRule; matched_keyword: string } | null {
  const haystack = normalizeMerchant(`${merchantName} ${description}`);
  if (!haystack) return null;
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    for (const kw of rule.keywords) {
      const normKw = normalizeMerchant(kw);
      if (normKw && haystack.includes(normKw)) {
        return { rule, matched_keyword: kw };
      }
    }
  }
  return null;
}

function uniqueTags(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

async function resolveAmountRon(
  supabase: SupabaseClient,
  amount: number,
  currency: string,
  date: string,
): Promise<{ amount_ron: number; rate: number | null; rate_date: string | null } | null> {
  if (currency === 'RON') {
    return { amount_ron: round2(amount), rate: null, rate_date: null };
  }
  if (!SUPPORTED_FX.has(currency)) {
    return null;
  }
  const { data } = await supabase
    .from('fx_rates')
    .select('date, rate_to_ron')
    .eq('currency', currency)
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const rate = Number(data.rate_to_ron);
  return { amount_ron: round2(amount * rate), rate, rate_date: data.date };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
