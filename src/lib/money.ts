/**
 * Supported currencies in Bundy. Picked for the Romanian audience:
 *   - RON: native
 *   - EUR, USD: most common foreign
 *   - GBP: UK diaspora
 *   - CHF, CAD, AUD: other diaspora destinations
 *   - HUF, PLN: neighboring countries / work migration
 *
 * All have daily FX rates published by BNR. Adding more is mechanical:
 *   1. Add the code below + to CURRENCIES
 *   2. Add to SUPPORTED sets in api/fx.ts, api/cron/generate-recurring.ts,
 *      api/bank/_sync.ts
 *   3. BNR XML (bnr.ro/files/xml/years/nbrfxratesYYYY.xml) already publishes
 *      it — no provider change needed
 */
export type Currency =
  | 'RON'
  | 'EUR'
  | 'USD'
  | 'GBP'
  | 'CHF'
  | 'CAD'
  | 'AUD'
  | 'HUF'
  | 'PLN';

export const CURRENCIES: Currency[] = [
  'RON', 'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'HUF', 'PLN',
];

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: Currency, locale = 'ro-RO'): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(amount: number, currency: Currency = 'RON'): string {
  return getFormatter(currency).format(amount);
}

export function formatRon(amount: number): string {
  return formatMoney(amount, 'RON');
}

export function convertToRon(amount: number, currency: Currency, rate: number): number {
  if (currency === 'RON') return round2(amount);
  return round2(amount * rate);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
