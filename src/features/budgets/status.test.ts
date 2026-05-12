import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { computeBudgetStatus } from './status';
import type { Budget } from '@/types';

const TODAY = dayjs();
const FUTURE = TODAY.add(1, 'month');
const PAST = TODAY.subtract(1, 'month');

function budget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'b1',
    profile_id: 'p1',
    name: 'Mâncare',
    amount_ron: 1000,
    currency: 'RON',
    period_kind: 'month',
    period_start: TODAY.startOf('month').format('YYYY-MM-DD'),
    period_end: TODAY.endOf('month').format('YYYY-MM-DD'),
    selected_days: null,
    thresholds_pct: [50, 80, 100],
    category_ids: [],
    subcategory_ids: [],
    sort_order: 0,
    created_at: TODAY.format('YYYY-MM-DD'),
    ...overrides,
  };
}

describe('computeBudgetStatus', () => {
  it('upcoming → period not started yet', () => {
    const s = computeBudgetStatus(
      budget({
        period_start: FUTURE.startOf('month').format('YYYY-MM-DD'),
        period_end: FUTURE.endOf('month').format('YYYY-MM-DD'),
      }),
      0,
    );
    expect(s.kind).toBe('upcoming');
    expect(s.color).toBe('gray');
  });

  it('exceeded → spent > amount mid-period', () => {
    const s = computeBudgetStatus(budget({ amount_ron: 1000 }), 1500);
    expect(s.kind).toBe('exceeded');
    expect(s.color).toBe('red');
  });

  it('exceeded → spent > amount even after period ends', () => {
    const s = computeBudgetStatus(
      budget({
        period_start: PAST.startOf('month').format('YYYY-MM-DD'),
        period_end: PAST.endOf('month').format('YYYY-MM-DD'),
        amount_ron: 1000,
      }),
      1500,
    );
    expect(s.kind).toBe('exceeded');
  });

  it('achieved → period finished and spent ≤ amount', () => {
    const s = computeBudgetStatus(
      budget({
        period_start: PAST.startOf('month').format('YYYY-MM-DD'),
        period_end: PAST.endOf('month').format('YYYY-MM-DD'),
        amount_ron: 1000,
      }),
      900,
    );
    expect(s.kind).toBe('achieved');
    expect(s.color).toBe('green');
  });

  it('achieved → period finished and spent EXACTLY equals amount', () => {
    const s = computeBudgetStatus(
      budget({
        period_start: PAST.startOf('month').format('YYYY-MM-DD'),
        period_end: PAST.endOf('month').format('YYYY-MM-DD'),
        amount_ron: 1000,
      }),
      1000,
    );
    expect(s.kind).toBe('achieved');
  });

  it('warning → active period and spent ≥ 90% of amount', () => {
    const s = computeBudgetStatus(budget({ amount_ron: 1000 }), 900);
    expect(s.kind).toBe('warning');
    expect(s.color).toBe('orange');
  });

  it('warning → exactly 90% triggers warning', () => {
    const s = computeBudgetStatus(budget({ amount_ron: 1000 }), 900);
    expect(s.kind).toBe('warning');
  });

  it('active → period in progress, well below 90%', () => {
    const s = computeBudgetStatus(budget({ amount_ron: 1000 }), 100);
    expect(s.kind).toBe('active');
    expect(s.color).toBe('accent');
  });

  it('active when amount is 0 (defensive — no division by 0)', () => {
    const s = computeBudgetStatus(budget({ amount_ron: 0 }), 0);
    expect(s.kind).toBe('active');
  });

  it('respects selected_days for custom period (not period_start/end)', () => {
    const s = computeBudgetStatus(
      budget({
        selected_days: [
          TODAY.subtract(2, 'day').format('YYYY-MM-DD'),
          TODAY.subtract(1, 'day').format('YYYY-MM-DD'),
          TODAY.format('YYYY-MM-DD'),
        ],
        period_start: '2020-01-01',
        period_end: '2030-12-31',
      }),
      0,
    );
    expect(s.kind).toBe('active');
  });

  it('upcoming when selected_days are in the future', () => {
    const s = computeBudgetStatus(
      budget({
        selected_days: [
          FUTURE.format('YYYY-MM-DD'),
          FUTURE.add(7, 'day').format('YYYY-MM-DD'),
        ],
        period_start: '2020-01-01',
        period_end: '2030-12-31',
      }),
      0,
    );
    expect(s.kind).toBe('upcoming');
  });

  it('achieved when last selected_day is in the past and spent ≤ amount', () => {
    const s = computeBudgetStatus(
      budget({
        selected_days: [
          PAST.format('YYYY-MM-DD'),
          PAST.add(7, 'day').format('YYYY-MM-DD'),
        ],
        period_start: '2020-01-01',
        period_end: '2030-12-31',
        amount_ron: 1000,
      }),
      500,
    );
    expect(s.kind).toBe('achieved');
  });
});
