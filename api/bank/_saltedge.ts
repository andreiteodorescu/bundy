/**
 * Server-side Salt Edge Open Banking API client (AIS — Account Information).
 *
 * Auth model:
 *   - Salt Edge uses static App-id + Secret HTTP headers (no token refresh).
 *   - All requests need both. Set SALTEDGE_APP_ID + SALTEDGE_APP_SECRET in env.
 *
 * Customer model:
 *   - Each end-user maps to one Salt Edge "customer" (created lazily on first
 *     connect). The Salt Edge customer_id is stored on profiles.saltedge_customer_id.
 *
 * Connect flow:
 *   - We create a "connect session" → returns a `connect_url` the user visits.
 *     The user authorizes at their bank, then Salt Edge redirects them back to
 *     our return_to URL with `?status=...`.
 *   - After redirect, the actual connection_id is fetched server-side via
 *     `GET /connections?customer_id=...` (we pick the freshest one for the customer).
 *
 * Docs: https://docs.saltedge.com/v6
 */

const BASE_URL = 'https://www.saltedge.com/api/v6';

export type SeProvider = {
  code: string;
  name: string;
  country_code: string;
  status: string;
  logo_url?: string | null;
  interactive: boolean;
  identification_mode?: string;
};

export type SeCustomer = {
  id: string;
  identifier: string;
  secret: string;
};

export type SeConnectSession = {
  expires_at: string;
  connect_url: string;
};

export type SeConnection = {
  id: string;
  customer_id: string;
  provider_code: string;
  provider_name: string;
  status: 'active' | 'inactive' | 'disabled';
  next_refresh_possible_at: string | null;
  last_attempt: {
    id: string;
    finished: boolean;
    finished_recent: boolean;
    api_mode: string;
    consent_id: string | null;
    consent_types?: string[] | null;
    fail_at: string | null;
    fail_error_class: string | null;
    fail_message: string | null;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
};

export type SeAccount = {
  id: string;
  connection_id: string;
  name: string;
  nature: string;
  balance: number;
  currency_code: string;
  extra?: {
    iban?: string | null;
    account_name?: string | null;
    account_number?: string | null;
  } | null;
};

export type SeTransaction = {
  id: string;
  duplicated: boolean;
  mode: 'normal' | 'fee' | 'transfer';
  status: 'posted' | 'pending';
  made_on: string;
  amount: number;
  currency_code: string;
  description: string;
  category: string;
  account_id: string;
  extra?: {
    merchant_id?: string | null;
    payee?: string | null;
    payer?: string | null;
    original_amount?: number | null;
    original_currency_code?: string | null;
    posting_date?: string | null;
    info?: string | null;
  } | null;
};

type SeListResponse<T> = {
  data: T[];
  meta?: { next_id?: string | null; next_page?: string | null };
};

type SeSingleResponse<T> = { data: T };

function getHeaders(): Record<string, string> {
  const appId = process.env.SALTEDGE_APP_ID;
  const secret = process.env.SALTEDGE_APP_SECRET;
  if (!appId || !secret) {
    throw new Error('SALTEDGE_APP_ID and SALTEDGE_APP_SECRET must be set');
  }
  return {
    'App-id': appId,
    Secret: secret,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // Salt Edge's WAF blocks requests without a recognizable User-Agent (default
    // Edge/Workers UA gets 403). Identify ourselves explicitly.
    'User-Agent': 'Bundy/1.0 (+https://bundy.ro)',
  };
}

async function seFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...getHeaders(), ...((init.headers as Record<string, string>) ?? {}) };
  // 8s timeout — Salt Edge endpoints normally answer in < 1s. Anything beyond
  // that is a hang and would just consume our Vercel function budget.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Salt Edge ${init.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function listProviders(country: string): Promise<SeProvider[]> {
  // Single page — Salt Edge returns up to 100 providers per page, more than
  // enough for a country list (RO has ~30 banks). Avoids unbounded loops if
  // their `next_id` cursor misbehaves.
  const qs = new URLSearchParams({
    country_code: country.toUpperCase(),
    include_fakes: 'true',
  });
  const res = await seFetch<SeListResponse<SeProvider>>(`/providers?${qs.toString()}`);
  return res.data.filter((p) => p.status !== 'inactive' && p.status !== 'disabled');
}

export async function createCustomer(identifier: string): Promise<SeCustomer> {
  const res = await seFetch<SeSingleResponse<SeCustomer>>('/customers', {
    method: 'POST',
    body: JSON.stringify({ data: { identifier } }),
  });
  return res.data;
}

export async function findCustomerByIdentifier(identifier: string): Promise<SeCustomer | null> {
  const qs = new URLSearchParams({ identifier });
  const res = await seFetch<SeListResponse<SeCustomer>>(`/customers?${qs.toString()}`);
  return res.data[0] ?? null;
}

export async function createConnectSession(args: {
  customerId: string;
  providerCode: string;
  returnTo: string;
}): Promise<SeConnectSession> {
  const res = await seFetch<SeSingleResponse<SeConnectSession>>('/connect_sessions/create', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        customer_id: args.customerId,
        consent: {
          scopes: ['account_details', 'transactions_details'],
        },
        attempt: {
          return_to: args.returnTo,
          fetch_scopes: ['accounts', 'transactions'],
        },
        provider_code: args.providerCode,
      },
    }),
  });
  return res.data;
}

export async function listConnections(customerId: string): Promise<SeConnection[]> {
  const qs = new URLSearchParams({ customer_id: customerId });
  const res = await seFetch<SeListResponse<SeConnection>>(`/connections?${qs.toString()}`);
  return res.data;
}

export async function getConnection(connectionId: string): Promise<SeConnection> {
  const res = await seFetch<SeSingleResponse<SeConnection>>(`/connections/${connectionId}`);
  return res.data;
}

export async function listAccounts(connectionId: string): Promise<SeAccount[]> {
  const all: SeAccount[] = [];
  let nextId: string | null = null;
  do {
    const qs = new URLSearchParams({ connection_id: connectionId });
    if (nextId) qs.set('from_id', nextId);
    const res = await seFetch<SeListResponse<SeAccount>>(`/accounts?${qs.toString()}`);
    all.push(...res.data);
    nextId = res.meta?.next_id ?? null;
  } while (nextId);
  return all;
}

export async function listTransactions(args: {
  connectionId: string;
  accountId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<SeTransaction[]> {
  const all: SeTransaction[] = [];
  let nextId: string | null = null;
  do {
    const qs = new URLSearchParams({
      connection_id: args.connectionId,
      account_id: args.accountId,
    });
    if (args.fromDate) qs.set('from_date', args.fromDate);
    if (args.toDate) qs.set('to_date', args.toDate);
    if (nextId) qs.set('from_id', nextId);
    const res = await seFetch<SeListResponse<SeTransaction>>(`/transactions?${qs.toString()}`);
    all.push(...res.data);
    nextId = res.meta?.next_id ?? null;
  } while (nextId);
  return all;
}

export async function removeConnection(connectionId: string): Promise<void> {
  await seFetch(`/connections/${connectionId}`, { method: 'DELETE' });
}

/**
 * Extract merchant + description text from a Salt Edge transaction. `description`
 * usually holds the raw bank string, while `extra.payee` / `extra.merchant_id`
 * may hold cleaner normalized names. We concat the most useful fields so the
 * keyword matcher has plenty to chew on.
 */
export function extractMerchantText(tx: SeTransaction): { merchantName: string; description: string } {
  const payee = tx.extra?.payee ?? '';
  const merchantName = payee || tx.description || '';
  const description = [tx.description, tx.extra?.info ?? '', tx.category]
    .filter(Boolean)
    .join(' | ')
    .trim();
  return { merchantName, description };
}
