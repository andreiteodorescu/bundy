import type { Currency } from '@/lib/money';

export type Profile = {
  id: string;
  name: string;
  icon: string;
  base_currency: string;
  locale: string;
  hidden_pin_hash: string | null;
  settings: Record<string, unknown>;
  created_at: string;
};

export type Category = {
  id: string;
  profile_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  slug: string | null;
  created_at: string;
};

export type Subcategory = {
  id: string;
  profile_id: string;
  parent_category_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  slug: string | null;
};

export type ExpenseSource = 'manual' | 'subscription' | 'fixed' | 'loan' | 'quick';

export type QuickExpense = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type PredefinedExpense = {
  id: string;
  profile_id: string;
  name: string;
  default_currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type Loan = {
  id: string;
  profile_id: string;
  name: string;
  bank: string | null;
  total_amount: number | null;
  monthly_payment: number;
  currency: Currency;
  charge_day: number;
  start_date: string;
  end_date: string | null;
  interest_rate: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  profile_id: string;
  name: string;
  amount_original: number;
  currency_original: Currency;
  amount_ron: number;
  fx_rate: number | null;
  fx_rate_date: string | null;
  occurred_on: string;
  category_id: string | null;
  subcategory_id: string | null;
  note: string | null;
  tags: string[];
  source: ExpenseSource;
  source_ref_id: string | null;
  recurrence: Record<string, unknown> | null;
  quantity: number | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};

export type SubscriptionCadence = 'weekly' | 'monthly' | 'yearly';

export type Subscription = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: Currency;
  cadence: SubscriptionCadence;
  charge_day: number;
  charge_month: number | null;
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[];
  active: boolean;
  paused_until: string | null;
  start_date: string;
  end_date: string | null;
  /** Optional brand logo slug (e.g. 'netflix'). NULL = auto-detect by name. */
  brand_logo: string | null;
};

export type FixedExpense = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: Currency;
  category_id: string | null;
  subcategory_id: string | null;
  sort_order: number;
};

export type BudgetPeriodKind = 'days' | 'month' | 'year' | 'months_forward';

export type Budget = {
  id: string;
  profile_id: string;
  name: string;
  amount_ron: number;
  currency: Currency;
  period_kind: BudgetPeriodKind;
  period_start: string;
  period_end: string;
  selected_days: string[] | null;
  thresholds_pct: number[];
  /** Filter by category_id (includes all subcategories under it). Empty = no filter. */
  category_ids: string[];
  /** Filter by subcategory_id specifically. Empty = no filter. Combined with category_ids
   *  via OR (an expense matches if its category OR subcategory is in the respective list). */
  subcategory_ids: string[];
  created_at: string;
};

export type BrandRule = {
  id: string;
  profile_id: string | null;
  pattern: string;
  match_kind: 'contains' | 'starts_with' | 'regex';
  category_id: string | null;
  subcategory_id: string | null;
  category_slug?: string;
  subcategory_slug?: string;
  priority: number;
};
