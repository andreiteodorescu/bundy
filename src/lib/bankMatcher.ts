import type { BankImportRule } from '@/types';

/**
 * Normalize a merchant name string for keyword matching. Strips diacritics, whitespace,
 * punctuation, lowercases everything. So "MEGA IMAGE 1234 RO", "MegaImage S.A.",
 * "MEGAIMAGE" all collapse to "megaimage" and match a stored keyword "mega image"
 * (also normalized to "megaimage").
 */
export function normalizeMerchant(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export type MatchedRule = {
  rule: BankImportRule;
  matched_keyword: string;
};

/**
 * Find the highest-priority enabled rule that matches the merchant name.
 *
 * Algorithm:
 *   1. Normalize the merchant name once.
 *   2. Sort rules by priority desc (higher priority wins).
 *   3. For each rule, check if any of its keywords (normalized) is contained
 *      in the normalized merchant name. First match wins.
 *
 * Returns null if no rule matches — caller should treat the transaction as
 * "pending_review" (visible in the netagged bucket, not auto-imported).
 */
export function matchBankRule(
  merchantName: string | null,
  description: string | null,
  rules: BankImportRule[],
): MatchedRule | null {
  // Bank descriptions vary wildly — sometimes the merchant name is in `merchant_name`,
  // sometimes it's buried in `description`. We concat + normalize both for the haystack.
  const haystack = normalizeMerchant(`${merchantName ?? ''} ${description ?? ''}`);
  if (!haystack) return null;

  const sorted = [...rules]
    .filter((r) => r.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    for (const keyword of rule.keywords) {
      const normKw = normalizeMerchant(keyword);
      if (!normKw) continue;
      if (haystack.includes(normKw)) {
        return { rule, matched_keyword: keyword };
      }
    }
  }
  return null;
}
