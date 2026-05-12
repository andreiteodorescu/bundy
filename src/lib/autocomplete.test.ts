import { describe, expect, it } from 'vitest';
import { suggestCategory } from './autocomplete';
import type { BrandRule, Expense } from '@/types';

function rule(overrides: Partial<BrandRule> = {}): BrandRule {
  return {
    id: 'r1',
    profile_id: null,
    pattern: 'bolt',
    match_kind: 'contains',
    category_id: 'cat-transport',
    subcategory_id: 'sub-rideshare',
    priority: 0,
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    profile_id: 'p1',
    name: 'Pizza',
    amount_original: 50,
    currency_original: 'RON',
    amount_ron: 50,
    fx_rate: null,
    fx_rate_date: null,
    occurred_on: '2026-05-01',
    category_id: 'cat-food',
    subcategory_id: 'sub-restaurant',
    note: null,
    tags: [],
    source: 'manual',
    source_ref_id: null,
    recurrence: null,
    quantity: null,
    hidden: false,
    created_at: '2026-05-01',
    updated_at: '2026-05-01',
    ...overrides,
  };
}

describe('suggestCategory', () => {
  it('returns null for input shorter than 2 chars', () => {
    expect(suggestCategory('a', { userRules: [], seedRules: [], history: [] })).toBeNull();
  });

  it('returns null when no rule and no history matches', () => {
    expect(
      suggestCategory('xyzzz random', { userRules: [], seedRules: [], history: [] }),
    ).toBeNull();
  });

  it('seed rule wins over no match', () => {
    const result = suggestCategory('Bolt ride home', {
      userRules: [],
      seedRules: [rule({ pattern: 'bolt', priority: 0 })],
      history: [],
    });
    expect(result?.category_id).toBe('cat-transport');
    expect(result?.reason).toBe('seed-rule');
  });

  it('user rule wins over seed rule even with same pattern', () => {
    const result = suggestCategory('Bolt ride', {
      userRules: [rule({
        pattern: 'bolt',
        category_id: 'cat-USER',
        profile_id: 'p1',
      })],
      seedRules: [rule({ pattern: 'bolt', category_id: 'cat-SEED' })],
      history: [],
    });
    expect(result?.category_id).toBe('cat-USER');
    expect(result?.reason).toBe('user-rule');
  });

  it('higher priority rule wins ("bolt food" > "bolt")', () => {
    const result = suggestCategory('Bolt food masă', {
      userRules: [],
      seedRules: [
        rule({ pattern: 'bolt', priority: 0, category_id: 'cat-rideshare' }),
        rule({ pattern: 'bolt food', priority: 10, category_id: 'cat-delivery' }),
      ],
      history: [],
    });
    expect(result?.category_id).toBe('cat-delivery');
    expect(result?.matched).toBe('bolt food');
  });

  it('case insensitive match', () => {
    const result = suggestCategory('FRESHFUL comandă mare', {
      userRules: [],
      seedRules: [rule({ pattern: 'freshful', category_id: 'cat-groceries' })],
      history: [],
    });
    expect(result?.category_id).toBe('cat-groceries');
  });

  it('matches input with diacritics against pattern without', () => {
    const result = suggestCategory('Spălat mașină', {
      userRules: [],
      seedRules: [rule({ pattern: 'spalat masina', category_id: 'cat-car' })],
      history: [],
    });
    expect(result?.category_id).toBe('cat-car');
  });

  it('starts_with match_kind only matches at start', () => {
    const result = suggestCategory('Comandă bolt', {
      userRules: [],
      seedRules: [rule({
        pattern: 'bolt',
        match_kind: 'starts_with',
        category_id: 'cat-transport',
      })],
      history: [],
    });
    expect(result).toBeNull();
  });

  it('regex match_kind respects pattern', () => {
    const result = suggestCategory('Cumpărături 100 RON', {
      userRules: [],
      seedRules: [rule({
        pattern: 'cump.?r.?turi',
        match_kind: 'regex',
        category_id: 'cat-shopping',
      })],
      history: [],
    });
    expect(result?.category_id).toBe('cat-shopping');
  });

  it('falls back to history fuzzy match when no rule matches', () => {
    const result = suggestCategory('Pizza', {
      userRules: [],
      seedRules: [],
      history: [expense({ name: 'Pizza' })],
    });
    expect(result?.reason).toBe('history');
    expect(result?.category_id).toBe('cat-food');
  });

  it('rule beats history even if both match', () => {
    const result = suggestCategory('Pizza', {
      userRules: [],
      seedRules: [rule({ pattern: 'pizza', category_id: 'cat-pizza-rule' })],
      history: [expense({ name: 'Pizza', category_id: 'cat-pizza-history' })],
    });
    expect(result?.reason).toBe('seed-rule');
    expect(result?.category_id).toBe('cat-pizza-rule');
  });
});
