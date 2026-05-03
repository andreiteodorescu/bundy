/**
 * Strip Romanian diacritics so brand-rule patterns ("spalat masina") can match
 * input written with diacritics ("Spălat mașină").
 *
 *   normalize('Spălat mașină') === 'spalat masina'
 *   normalize('Întreținere')   === 'intretinere'
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Strip cosmetic category hints from expense names: "(eating out)", "(food delivery)",
 * "(drinks)". Used at display time in the Add Expense autocomplete + expenses list.
 *
 *   cleanExpenseName('Tacos MAT (eating out)')      === 'Tacos MAT'
 *   cleanExpenseName('Pizza (food delivery)')        === 'Pizza'
 *   cleanExpenseName('Cumpărături')                  === 'Cumpărături'  (no-op)
 *
 * Idempotent.
 */
const HINT_PATTERNS: RegExp[] = [
  /\s*\(\s*eating out\s*\)/gi,
  /\s*\(\s*food delivery\s*\)/gi,
  /\s*\(\s*drinks\s*\)/gi,
];

export function cleanExpenseName(name: string): string {
  let cleaned = name;
  for (const p of HINT_PATTERNS) cleaned = cleaned.replace(p, '');
  return cleaned.trim();
}

/**
 * Diacritics-insensitive filter for Mantine Select / MultiSelect / Autocomplete.
 *
 *   <Select filter={diacriticsFilter} ... />
 *
 * User types "vacanta" → matches "Vacanță". Type "macare" → matches "Mâncare & Băuturi".
 * Handles both flat option lists and grouped lists (preserves group structure, only
 * keeps groups that have at least one matching item).
 *
 * We use the OptionsFilter type from Mantine for proper typing.
 */
import type { OptionsFilter } from '@mantine/core';

export const diacriticsFilter: OptionsFilter = ({ options, search }) => {
  const q = normalize(search.trim());
  if (!q) return options;

  const out: typeof options = [];
  for (const opt of options) {
    if ('group' in opt && Array.isArray(opt.items)) {
      const items = opt.items.filter((it) => normalize(it.label).includes(q));
      if (items.length > 0) out.push({ ...opt, items });
    } else if ('label' in opt) {
      if (normalize(opt.label).includes(q)) out.push(opt);
    }
  }
  return out;
};
