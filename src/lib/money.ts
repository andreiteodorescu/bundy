export type Currency = 'RON' | 'EUR' | 'USD';

export const CURRENCIES: Currency[] = ['RON', 'EUR', 'USD'];

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
