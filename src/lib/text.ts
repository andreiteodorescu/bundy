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
