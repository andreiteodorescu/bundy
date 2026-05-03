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
