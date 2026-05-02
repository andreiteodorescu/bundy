import { useMemo } from 'react';
import { useCategories, useSubcategories } from '@/features/categories/api';
import { suggestCategory, type Suggestion } from '@/lib/autocomplete';
import { useBrandRules, useRecentExpenses } from './api';

/**
 * High-level hook that wires categories, subcategories, brand rules and history into
 * a single `suggest(name)` callback for the AddExpense form.
 */
export function useAutoSuggest() {
  const cats = useCategories();
  const subs = useSubcategories();
  const history = useRecentExpenses(500);

  const slugToCategoryId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cats.data ?? []) {
      if (c.slug) m.set(c.slug, c.id);
    }
    return m;
  }, [cats.data]);

  const slugToSubcategoryId = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of subs.data ?? []) {
      if (s.slug) m.set(s.slug, s.id);
    }
    return m;
  }, [subs.data]);

  const rules = useBrandRules(slugToCategoryId, slugToSubcategoryId);

  return useMemo(() => {
    const userRules = rules.data?.userRules ?? [];
    const seedRules = rules.data?.seedRules ?? [];
    const historyExpenses = history.data ?? [];
    return {
      ready: !cats.isLoading && !subs.isLoading && !rules.isLoading,
      suggest(name: string): Suggestion | null {
        return suggestCategory(name, {
          userRules,
          seedRules,
          history: historyExpenses,
        });
      },
    };
  }, [rules.data, history.data, cats.isLoading, subs.isLoading, rules.isLoading]);
}
