import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { chargeDatesInWindow } from './generator';
import type { Loan } from '@/types';

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    profile_id: 'p1',
    name: 'Credit nevoi',
    bank: 'BCR',
    total_amount: 50000,
    monthly_payment: 1500,
    currency: 'RON',
    charge_day: 5,
    start_date: '2026-01-01',
    end_date: null,
    interest_rate: 7.5,
    category_id: null,
    subcategory_id: null,
    active: true,
    tags: [],
    note: null,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('loan chargeDatesInWindow', () => {
  it('one charge per month from start_date', () => {
    const dates = chargeDatesInWindow(
      loan({ charge_day: 5, start_date: '2026-01-01' }),
      dayjs('2026-01-01'),
      dayjs('2026-04-30'),
    );
    expect(dates).toEqual(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05']);
  });

  it('stops at end_date — no charges after loan is paid off', () => {
    const dates = chargeDatesInWindow(
      loan({ charge_day: 5, start_date: '2026-01-01', end_date: '2026-03-15' }),
      dayjs('2026-01-01'),
      dayjs('2026-12-31'),
    );
    expect(dates).toEqual(['2026-01-05', '2026-02-05', '2026-03-05']);
  });

  it('clamps charge_day=31 to last day of February', () => {
    const dates = chargeDatesInWindow(
      loan({ charge_day: 31, start_date: '2026-01-31' }),
      dayjs('2026-01-01'),
      dayjs('2026-04-30'),
    );
    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('idempotent — same window twice = same dates', () => {
    const l = loan({ charge_day: 15, start_date: '2026-01-01', end_date: '2027-12-31' });
    const a = chargeDatesInWindow(l, dayjs('2026-01-01'), dayjs('2026-06-30'));
    const b = chargeDatesInWindow(l, dayjs('2026-01-01'), dayjs('2026-06-30'));
    expect(a).toEqual(b);
  });

  it('end_date in the future doesnt include a charge for that exact day if window is shorter', () => {
    const dates = chargeDatesInWindow(
      loan({ charge_day: 5, start_date: '2026-01-01', end_date: '2027-12-31' }),
      dayjs('2026-01-01'),
      dayjs('2026-02-04'),
    );
    expect(dates).toEqual(['2026-01-05']);
  });
});
