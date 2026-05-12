import { describe, expect, it } from 'vitest';
import type { Currency } from './money';

// Pure logic test — replicates the conversion logic from displayCurrency.ts.
// We can't easily test the hook itself without a heavy React setup, but the
// math is the part most worth testing for correctness.

type ExpenseLike = {
  amount_original: number;
  currency_original: Currency;
  amount_ron: number;
  occurred_on: string;
};

function convertExpense(
  e: ExpenseLike,
  displayCurrency: Currency,
  ratesByDate: Map<string, number>, // date → RON per 1 unit of display currency
): number | null {
  if (displayCurrency === 'RON') return e.amount_ron;
  if (e.currency_original === displayCurrency) return e.amount_original;
  const rate = ratesByDate.get(e.occurred_on);
  if (!rate) return null;
  return e.amount_ron / rate;
}

describe('display currency conversion (Option C-B math)', () => {
  it('display=RON: returns amount_ron directly (no FX, no drift)', () => {
    const e: ExpenseLike = {
      amount_original: 50,
      currency_original: 'EUR',
      amount_ron: 248.50,
      occurred_on: '2026-01-15',
    };
    expect(convertExpense(e, 'RON', new Map())).toBe(248.50);
  });

  it('expense currency matches display: returns amount_original (native, exact)', () => {
    const e: ExpenseLike = {
      amount_original: 50,
      currency_original: 'GBP',
      amount_ron: 286.50,
      occurred_on: '2026-01-15',
    };
    expect(convertExpense(e, 'GBP', new Map())).toBe(50);
  });

  it('cross-currency: converts using historical rate from the expense date', () => {
    const e: ExpenseLike = {
      amount_original: 100,
      currency_original: 'EUR',
      amount_ron: 497, // pinned at insert: 100 EUR × 4.97 RON/EUR
      occurred_on: '2026-02-01',
    };
    // At 2026-02-01: 1 GBP = 5.81 RON
    const rates = new Map([['2026-02-01', 5.81]]);
    const result = convertExpense(e, 'GBP', rates);
    // Expected: 497 RON / 5.81 RON-per-GBP = 85.54 GBP
    expect(result).toBeCloseTo(85.54, 2);
  });

  it('returns null when rate is missing (loading state)', () => {
    const e: ExpenseLike = {
      amount_original: 100,
      currency_original: 'EUR',
      amount_ron: 497,
      occurred_on: '2026-02-01',
    };
    expect(convertExpense(e, 'GBP', new Map())).toBeNull();
  });

  it('cross-rate is calculated against the date of the expense (no drift across days)', () => {
    const e: ExpenseLike = {
      amount_original: 100,
      currency_original: 'EUR',
      amount_ron: 497,
      occurred_on: '2026-02-01',
    };
    // Today the GBP rate might be different (5.85) but we use Feb 1's rate (5.81)
    const ratesAtFeb1 = new Map([['2026-02-01', 5.81]]);
    const ratesAtMay = new Map([['2026-02-01', 5.81], ['2026-05-12', 5.85]]);

    // Both should give the same answer — the date of the expense is what matters
    expect(convertExpense(e, 'GBP', ratesAtFeb1)).toBeCloseTo(85.54, 2);
    expect(convertExpense(e, 'GBP', ratesAtMay)).toBeCloseTo(85.54, 2);
  });

  it('UK user with mostly-GBP spending: native amounts sum cleanly', () => {
    const expenses: ExpenseLike[] = [
      { amount_original: 50, currency_original: 'GBP', amount_ron: 290, occurred_on: '2026-01-01' },
      { amount_original: 30, currency_original: 'GBP', amount_ron: 174, occurred_on: '2026-01-15' },
      { amount_original: 100, currency_original: 'GBP', amount_ron: 580, occurred_on: '2026-02-01' },
    ];
    const total = expenses.reduce((s, e) => {
      const v = convertExpense(e, 'GBP', new Map());
      return v !== null ? s + v : s;
    }, 0);
    expect(total).toBe(180); // 50 + 30 + 100, pure arithmetic on native amounts
  });

  it('mixed-currency user: each expense uses its own historical rate', () => {
    const expenses: ExpenseLike[] = [
      { amount_original: 50, currency_original: 'GBP', amount_ron: 290, occurred_on: '2026-01-01' },
      { amount_original: 100, currency_original: 'EUR', amount_ron: 497, occurred_on: '2026-02-01' },
    ];
    const rates = new Map([
      ['2026-02-01', 5.81], // GBP rate on Feb 1 — only the EUR expense needs this
    ]);
    const total = expenses.reduce((s, e) => {
      const v = convertExpense(e, 'GBP', rates);
      return v !== null ? s + v : s;
    }, 0);
    // 50 (native) + 497/5.81 = 50 + 85.54 = 135.54
    expect(total).toBeCloseTo(135.54, 2);
  });

  it('Andrei-style profile (RON default, mixed expenses): identical to today\'s behavior', () => {
    const expenses: ExpenseLike[] = [
      { amount_original: 100, currency_original: 'RON', amount_ron: 100, occurred_on: '2026-01-01' },
      { amount_original: 50, currency_original: 'EUR', amount_ron: 248.50, occurred_on: '2026-01-15' },
      { amount_original: 30, currency_original: 'USD', amount_ron: 138, occurred_on: '2026-02-01' },
    ];
    const total = expenses.reduce((s, e) => {
      const v = convertExpense(e, 'RON', new Map());
      return v !== null ? s + v : s;
    }, 0);
    // Sum of amount_ron — exactly the current Bundy behavior
    expect(total).toBe(486.50);
  });
});
