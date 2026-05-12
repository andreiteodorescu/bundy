import { describe, expect, it } from 'vitest';
import { normalizeMerchant, matchBankRule } from './bankMatcher';
import type { BankImportRule } from '@/types';

function rule(overrides: Partial<BankImportRule> = {}): BankImportRule {
  return {
    id: 'r1',
    profile_id: 'p1',
    keywords: ['wolt'],
    category_id: 'cat-food',
    subcategory_id: 'sub-delivery',
    tags: [],
    priority: 0,
    enabled: true,
    created_at: '2026-01-01',
    ...overrides,
  };
}

describe('normalizeMerchant', () => {
  it.each<[string, string]>([
    ['MEGA IMAGE', 'megaimage'],
    ['MEGAIMAGE', 'megaimage'],
    ['Mega Image S.A.', 'megaimagesa'],
    ['POS  CARREFOUR-MARKET RO', 'poscarrefourmarketro'],
    ['Spălătorie Mașină', 'spalatoriemasina'],
    ['Cumpărături', 'cumparaturi'],
    ['', ''],
    ['   ', ''],
  ])('normalize(%s) → %s', (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });

  it('handles null/undefined gracefully', () => {
    expect(normalizeMerchant(null)).toBe('');
    expect(normalizeMerchant(undefined)).toBe('');
  });
});

describe('matchBankRule', () => {
  it('returns null when no rule matches', () => {
    expect(matchBankRule('Random Shop', null, [rule()])).toBeNull();
  });

  it('matches "MEGA IMAGE 1234 RO" against keyword "mega image"', () => {
    const r = rule({ keywords: ['mega image'], category_id: 'cat-groceries' });
    const result = matchBankRule('MEGA IMAGE 1234 RO', null, [r]);
    expect(result?.rule.category_id).toBe('cat-groceries');
    expect(result?.matched_keyword).toBe('mega image');
  });

  it('matches "MEGAIMAGE" (no space) against keyword "mega image"', () => {
    const r = rule({ keywords: ['mega image'], category_id: 'cat-groceries' });
    expect(matchBankRule('MEGAIMAGE', null, [r])?.rule.category_id).toBe('cat-groceries');
  });

  it('matches diacritics-aware: "Spălat mașină" against "spalat masina"', () => {
    const r = rule({ keywords: ['spalat masina'], category_id: 'cat-car' });
    expect(matchBankRule('Spălat mașină', null, [r])?.rule.category_id).toBe('cat-car');
  });

  it('higher priority rule wins', () => {
    const result = matchBankRule('Wolt Food order', null, [
      rule({ id: 'low', keywords: ['wolt'], priority: 0, category_id: 'cat-low' }),
      rule({ id: 'high', keywords: ['wolt food'], priority: 10, category_id: 'cat-high' }),
    ]);
    expect(result?.rule.category_id).toBe('cat-high');
  });

  it('disabled rules are skipped', () => {
    const r = rule({ keywords: ['wolt'], enabled: false });
    expect(matchBankRule('Wolt order', null, [r])).toBeNull();
  });

  it('multi-keyword rule: any keyword can match', () => {
    const r = rule({ keywords: ['digi', 'telekom', 'orange'], category_id: 'cat-telecom' });
    expect(matchBankRule('TELEKOM RO', null, [r])?.rule.category_id).toBe('cat-telecom');
    expect(matchBankRule('Orange Romania SA', null, [r])?.rule.category_id).toBe('cat-telecom');
  });

  it('uses both merchant_name AND description as haystack', () => {
    const r = rule({ keywords: ['carrefour'], category_id: 'cat-groceries' });
    expect(matchBankRule(null, 'POS purchase CARREFOUR MARKET', [r])?.rule.category_id)
      .toBe('cat-groceries');
  });

  it('returns null for empty haystack', () => {
    expect(matchBankRule(null, null, [rule()])).toBeNull();
    expect(matchBankRule('', '', [rule()])).toBeNull();
  });
});
