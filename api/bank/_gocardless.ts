/**
 * Server-side GoCardless Bank Account Data API client (formerly Nordigen).
 *
 * Auth model:
 *   - Each Vercel function invocation calls /token/new/ to get a fresh access token
 *     (~200ms, cheap). Tokens are valid 24h but we don't cache across invocations
 *     because Vercel functions are cold-start each time.
 *   - Account access uses requisitions (the user-facing 90-day consent flow).
 *
 * Docs: https://developer.gocardless.com/bank-account-data/overview
 *
 * Required env vars: GOCARDLESS_SECRET_ID, GOCARDLESS_SECRET_KEY (set in Vercel + .env.local).
 */

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

export type GcInstitution = {
  id: string;
  name: string;
  bic?: string;
  transaction_total_days: string;
  countries: string[];
  logo: string;
};

export type GcRequisition = {
  id: string;
  status: 'CR' | 'GC' | 'UA' | 'RJ' | 'SA' | 'GA' | 'LN' | 'EX'; // CR=created, LN=linked, EX=expired
  accounts: string[];
  reference: string;
  link: string;
  agreement?: string;
  institution_id: string;
  redirect: string;
};

export type GcAgreement = {
  id: string;
  max_historical_days: number;
  access_valid_for_days: number;
  access_scope: string[];
};

export type GcAccountDetails = {
  resourceId: string;
  iban?: string;
  currency: string;
  ownerName?: string;
  product?: string;
};

export type GcTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  bookingDate?: string;
  valueDate?: string;
  bookingDateTime?: string;
  transactionAmount: { amount: string; currency: string };
  creditorName?: string;
  debtorName?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  proprietaryBankTransactionCode?: string;
  merchantCategoryCode?: string;
};

export type GcTransactionsResponse = {
  transactions: {
    booked: GcTransaction[];
    pending: GcTransaction[];
  };
};

async function getAccessToken(): Promise<string> {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error('GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY must be set');
  }
  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: secretId, secret_key: secretKey }),
  });
  if (!res.ok) {
    throw new Error(`GoCardless auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access: string };
  return data.access;
}

async function gcFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const token = init.token ?? (await getAccessToken());
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoCardless ${init.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function listInstitutions(country: string): Promise<GcInstitution[]> {
  return gcFetch<GcInstitution[]>(`/institutions/?country=${country.toLowerCase()}`);
}

export async function createAgreement(institutionId: string): Promise<GcAgreement> {
  return gcFetch<GcAgreement>('/agreements/enduser/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: institutionId,
      max_historical_days: 90,
      access_valid_for_days: 90,
      access_scope: ['balances', 'details', 'transactions'],
    }),
  });
}

export async function createRequisition(args: {
  institutionId: string;
  redirectUrl: string;
  reference: string;
  agreementId?: string;
  userLanguage?: string;
}): Promise<GcRequisition> {
  return gcFetch<GcRequisition>('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: args.institutionId,
      redirect: args.redirectUrl,
      reference: args.reference,
      agreement: args.agreementId,
      user_language: args.userLanguage ?? 'EN',
    }),
  });
}

export async function getRequisition(id: string): Promise<GcRequisition> {
  return gcFetch<GcRequisition>(`/requisitions/${id}/`);
}

export async function getAccountDetails(accountId: string): Promise<GcAccountDetails> {
  const res = await gcFetch<{ account: GcAccountDetails }>(`/accounts/${accountId}/details/`);
  return res.account;
}

export async function getTransactions(
  accountId: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<GcTransactionsResponse> {
  const params = new URLSearchParams();
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return gcFetch<GcTransactionsResponse>(`/accounts/${accountId}/transactions/${qs}`);
}

/**
 * Extract a usable merchant name from a GoCardless transaction. Banks vary wildly in
 * what they put where: some use creditorName ("Mega Image SRL"), some put it in
 * remittanceInformationUnstructured ("POS PURCHASE MEGA IMAGE 1234 RO"), some use
 * proprietary codes only. We concat the most likely fields so the matcher has a
 * fat haystack to search.
 */
export function extractMerchantText(tx: GcTransaction): { merchantName: string; description: string } {
  const merchantName = tx.creditorName ?? tx.debtorName ?? '';
  const remittanceArr = (tx.remittanceInformationUnstructuredArray ?? []).join(' ');
  const description = [
    tx.remittanceInformationUnstructured ?? '',
    remittanceArr,
    tx.proprietaryBankTransactionCode ?? '',
  ]
    .filter(Boolean)
    .join(' | ')
    .trim();
  return { merchantName, description };
}
