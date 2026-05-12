import { describe, expect, it } from 'vitest';
import { monthlyEquivalent } from './utils';

describe('monthlyEquivalent', () => {
  it('daily × 365.25/12 days per month', () => {
    expect(monthlyEquivalent(5, 'daily')).toBeCloseTo(152.19, 1);
  });

  it('weekly × ~4.345 weeks per month', () => {
    expect(monthlyEquivalent(100, 'weekly')).toBeCloseTo(434.82, 1);
  });

  it('biweekly × ~2.17 fortnights per month', () => {
    expect(monthlyEquivalent(100, 'biweekly')).toBeCloseTo(217.41, 1);
  });

  it('monthly returns amount unchanged', () => {
    expect(monthlyEquivalent(50, 'monthly')).toBe(50);
  });

  it('quarterly ÷ 3', () => {
    expect(monthlyEquivalent(300, 'quarterly')).toBe(100);
  });

  it('semiannual ÷ 6', () => {
    expect(monthlyEquivalent(600, 'semiannual')).toBe(100);
  });

  it('yearly ÷ 12', () => {
    expect(monthlyEquivalent(1200, 'yearly')).toBe(100);
  });

  it('zero amount returns zero for every cadence', () => {
    const cadences = [
      'daily', 'weekly', 'biweekly', 'monthly',
      'quarterly', 'semiannual', 'yearly',
    ] as const;
    for (const c of cadences) {
      expect(monthlyEquivalent(0, c)).toBe(0);
    }
  });

  it('annualized totals match across cadences (50 RON/month equiv)', () => {
    expect(monthlyEquivalent(600, 'yearly')).toBe(50);
    expect(monthlyEquivalent(50, 'monthly')).toBe(50);
    expect(monthlyEquivalent(150, 'quarterly')).toBe(50);
    expect(monthlyEquivalent(300, 'semiannual')).toBe(50);
  });
});
