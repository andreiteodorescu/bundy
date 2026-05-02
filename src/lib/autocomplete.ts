import Fuse from 'fuse.js';
import type { BrandRule, Expense } from '@/types';

export type Suggestion = {
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[];
  confidence: 'high' | 'medium' | 'low';
  reason: 'user-rule' | 'seed-rule' | 'history';
  matched: string;
};

type Context = {
  userRules: BrandRule[];
  seedRules: BrandRule[];
  history: Expense[];
};

/**
 * 3-layer category suggestion:
 *   1. User-defined brand rules (profile-scoped, highest priority)
 *   2. Seeded global rules (RO brand dictionary, shipped with app)
 *   3. Fuzzy match against the user's expense history (Fuse.js)
 *
 * Returns null if no confident suggestion. The caller should leave the form empty
 * and let the user pick manually.
 */
export function suggestCategory(input: string, ctx: Context): Suggestion | null {
  const lc = input.trim().toLowerCase();
  if (lc.length < 2) return null;

  const ruleHit = matchRules(lc, ctx.userRules) ?? matchRules(lc, ctx.seedRules);
  if (ruleHit) return ruleHit;

  if (ctx.history.length > 0) {
    const fuse = new Fuse(ctx.history, {
      keys: ['name'],
      threshold: 0.35,
      includeScore: true,
    });
    const results = fuse.search(lc, { limit: 1 });
    const best = results[0];
    if (best && (best.score ?? 1) < 0.35 && best.item.category_id) {
      return {
        category_id: best.item.category_id,
        subcategory_id: best.item.subcategory_id,
        tags: best.item.tags ?? [],
        confidence: 'medium',
        reason: 'history',
        matched: best.item.name,
      };
    }
  }

  return null;
}

function matchRules(lc: string, rules: BrandRule[]): Suggestion | null {
  const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  for (const rule of sorted) {
    const p = rule.pattern.toLowerCase();
    let hit = false;
    if (rule.match_kind === 'starts_with') {
      hit = lc.startsWith(p);
    } else if (rule.match_kind === 'regex') {
      try {
        hit = new RegExp(rule.pattern, 'i').test(lc);
      } catch {
        hit = false;
      }
    } else {
      hit = lc.includes(p);
    }
    if (hit) {
      return {
        category_id: rule.category_id,
        subcategory_id: rule.subcategory_id,
        tags: [],
        confidence: 'high',
        reason: rule.profile_id ? 'user-rule' : 'seed-rule',
        matched: rule.pattern,
      };
    }
  }
  return null;
}
