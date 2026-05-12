import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import { chargeDatesInWindow } from './generator';
import type { Subscription, SubscriptionCadence } from '@/types';

function sub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    profile_id: 'p1',
    name: 'Test',
    amount: 50,
    currency: 'RON',
    cadence: 'monthly',
    charge_day: 15,
    charge_month: null,
    category_id: null,
    subcategory_id: null,
    tags: [],
    active: true,
    paused_until: null,
    start_date: '2026-01-01',
    end_date: null,
    brand_logo: null,
    ...overrides,
  };
}

describe('chargeDatesInWindow — monthly', () => {
  it('inserts one date per month between start_date and window end', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'monthly', charge_day: 15, start_date: '2026-01-01' }),
      dayjs('2026-01-01'),
      dayjs('2026-05-12'),
    );
    expect(dates).toEqual([
      '2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15',
    ]);
  });

  it('clamps charge_day=31 to last day of February', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'monthly', charge_day: 31, start_date: '2026-01-31' }),
      dayjs('2026-01-01'),
      dayjs('2026-04-30'),
    );
    expect(dates).toContain('2026-02-28');
    expect(dates).toContain('2026-03-31');
    expect(dates).toContain('2026-04-30');
  });

  it('respects end_date — no dates after subscription ends', () => {
    const dates = chargeDatesInWindow(
      sub({
        cadence: 'monthly',
        charge_day: 15,
        start_date: '2026-01-01',
        end_date: '2026-03-20',
      }),
      dayjs('2026-01-01'),
      dayjs('2026-06-01'),
    );
    expect(dates).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  it('skips dates before start_date even if window starts earlier', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'monthly', charge_day: 15, start_date: '2026-03-20' }),
      dayjs('2026-01-01'),
      dayjs('2026-06-01'),
    );
    expect(dates).toEqual(['2026-04-15', '2026-05-15']);
  });
});

describe('chargeDatesInWindow — daily', () => {
  it('every day from start_date to window end', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'daily', charge_day: 1, start_date: '2026-05-01' }),
      dayjs('2026-05-01'),
      dayjs('2026-05-05'),
    );
    expect(dates).toEqual([
      '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
    ]);
  });
});

describe('chargeDatesInWindow — weekly', () => {
  it('only the specified weekday (charge_day=1 = Monday)', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'weekly', charge_day: 1, start_date: '2026-05-01' }),
      dayjs('2026-05-01'),
      dayjs('2026-05-31'),
    );
    expect(dates).toEqual(['2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25']);
  });
});

describe('chargeDatesInWindow — biweekly', () => {
  it('every 14 days anchored on first matching weekday on/after start', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'biweekly', charge_day: 1, start_date: '2026-05-01' }),
      dayjs('2026-05-01'),
      dayjs('2026-06-30'),
    );
    expect(dates).toEqual(['2026-05-04', '2026-05-18', '2026-06-01', '2026-06-15', '2026-06-29']);
  });
});

describe('chargeDatesInWindow — quarterly', () => {
  it('every 3 months anchored on start_date month', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'quarterly', charge_day: 10, start_date: '2026-01-10' }),
      dayjs('2026-01-01'),
      dayjs('2026-12-31'),
    );
    expect(dates).toEqual(['2026-01-10', '2026-04-10', '2026-07-10', '2026-10-10']);
  });
});

describe('chargeDatesInWindow — semiannual', () => {
  it('every 6 months', () => {
    const dates = chargeDatesInWindow(
      sub({ cadence: 'semiannual', charge_day: 1, start_date: '2026-01-01' }),
      dayjs('2026-01-01'),
      dayjs('2026-12-31'),
    );
    expect(dates).toEqual(['2026-01-01', '2026-07-01']);
  });
});

describe('chargeDatesInWindow — yearly', () => {
  it('once per year on charge_month + charge_day', () => {
    const dates = chargeDatesInWindow(
      sub({
        cadence: 'yearly',
        charge_day: 15,
        charge_month: 6,
        start_date: '2025-01-01',
      }),
      dayjs('2025-01-01'),
      dayjs('2027-01-01'),
    );
    expect(dates).toEqual(['2025-06-15', '2026-06-15']);
  });
});

describe('chargeDatesInWindow — idempotency property', () => {
  it('called twice with same window returns identical date arrays', () => {
    const cadences: SubscriptionCadence[] = [
      'daily', 'weekly', 'biweekly', 'monthly',
      'quarterly', 'semiannual', 'yearly',
    ];
    for (const c of cadences) {
      const s = sub({
        cadence: c,
        charge_day: c === 'weekly' || c === 'biweekly' ? 3 : 15,
        charge_month: c === 'yearly' ? 6 : null,
        start_date: '2026-01-15',
      });
      const win1 = chargeDatesInWindow(s, dayjs('2026-01-01'), dayjs('2026-12-31'));
      const win2 = chargeDatesInWindow(s, dayjs('2026-01-01'), dayjs('2026-12-31'));
      expect(win2).toEqual(win1);
    }
  });
});
