/**
 * Default bank import rules seeded for every new profile on first login. Same set as
 * migration 0032 applies to existing profiles. Keep these in sync.
 *
 * Each entry: keywords (matched against normalized merchant_name) → category + subcategory.
 * Bilingual: keywords are merchant names (banks send them verbatim, no localization),
 * categories resolve via slug → ID at seed time so the rules work on RO and EN UIs.
 */

export type BankRuleSeed = {
  keywords: string[];
  category_slug: string;
  subcategory_slug: string | null;
  priority: number;
};

export const seedBankRules: BankRuleSeed[] = [
  { keywords: ['wolt', 'wolt food'],                            category_slug: 'food-drinks',   subcategory_slug: 'food-delivery',    priority: 10 },
  { keywords: ['freshful', 'frsh'],                             category_slug: 'food-drinks',   subcategory_slug: 'online-groceries', priority: 10 },
  { keywords: ['carrefour', 'mega image'],                      category_slug: 'food-drinks',   subcategory_slug: 'groceries',        priority: 10 },
  { keywords: ['digi', 'rds', 'telekom', 'orange', 'vodafone'], category_slug: 'home-bills',    subcategory_slug: 'internet-tv',      priority: 10 },
  { keywords: ['zooplus'],                                      category_slug: 'pets',          subcategory_slug: 'pet-food',         priority: 10 },
  { keywords: ['emag', 'fashion days'],                         category_slug: 'shopping',      subcategory_slug: 'online-shopping',  priority: 10 },
  { keywords: ['uber'],                                         category_slug: 'transport-car', subcategory_slug: 'ride-sharing',     priority: 10 },
];
