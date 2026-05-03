/**
 * Smart parser for the search input. Decides what kind of query the user typed:
 *
 *   "500" / "500.5" / "500,50"            → number (search by amount, ±5% tolerance)
 *
 *   Date formats (zi-luna-an, format european RO):
 *   "03-05-2026"  "03/05/2026"  "03.05.2026"  → exact date (3 mai 2026)
 *   "3-5-2026"    "3/5/2026"                  → exact date (single-digit ok)
 *   "2026-05-03"  (ISO)                       → exact date
 *
 *   Month formats:
 *   "05-2026"  "05/2026"  "05.2026"           → entire month (mai 2026)
 *   "5-2026"   "5/2026"                       → entire month (single-digit ok)
 *   "2026-05"  (ISO)                          → entire month
 *
 *   everything else                            → text search
 */
export type ParseResult =
  | { kind: 'text';   raw: string }
  | { kind: 'number'; value: number; raw: string }
  | { kind: 'date';   iso: string;   raw: string }
  | { kind: 'month';  ym: string;    raw: string };

const SEP = '[-/.]'; // accepted separators: - / .

const RE_NUMBER     = /^\d+(?:[.,]\d{1,2})?$/;
const RE_ISO_DATE   = /^\d{4}-\d{2}-\d{2}$/;
const RE_ISO_MONTH  = /^\d{4}-\d{2}$/;
const RE_EU_DATE    = new RegExp(`^(\\d{1,2})${SEP}(\\d{1,2})${SEP}(\\d{4})$`);
const RE_EU_MONTH   = new RegExp(`^(\\d{1,2})${SEP}(\\d{4})$`);

export function parseSearch(input: string): ParseResult {
  const trimmed = input.trim();

  // 1) Pure number (amount search)
  if (RE_NUMBER.test(trimmed)) {
    const num = Number(trimmed.replace(',', '.'));
    if (num > 0) return { kind: 'number', value: num, raw: trimmed };
  }

  // 2) ISO date YYYY-MM-DD
  if (RE_ISO_DATE.test(trimmed)) {
    return { kind: 'date', iso: trimmed, raw: trimmed };
  }

  // 3) European date DD-MM-YYYY (also DD/MM/YYYY, DD.MM.YYYY, single digits ok)
  const euDate = trimmed.match(RE_EU_DATE);
  if (euDate) {
    const day = Number(euDate[1]);
    const month = Number(euDate[2]);
    const year = Number(euDate[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { kind: 'date', iso, raw: trimmed };
    }
  }

  // 4) ISO year-month YYYY-MM
  if (RE_ISO_MONTH.test(trimmed)) {
    return { kind: 'month', ym: trimmed, raw: trimmed };
  }

  // 5) European month MM-YYYY (also MM/YYYY, MM.YYYY)
  const euMonth = trimmed.match(RE_EU_MONTH);
  if (euMonth) {
    const month = Number(euMonth[1]);
    const year = Number(euMonth[2]);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      const ym = `${year}-${String(month).padStart(2, '0')}`;
      return { kind: 'month', ym, raw: trimmed };
    }
  }

  return { kind: 'text', raw: trimmed };
}

/** Strip characters that would break PostgREST `.or()` syntax. */
export function sanitizeForIlike(input: string): string {
  return input.replace(/[,()*]/g, ' ').replace(/\s+/g, ' ').trim();
}
