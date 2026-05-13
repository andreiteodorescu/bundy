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
  tags: string[];
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
  tags: string[];
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
  tags: string[];
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

export type SubscriptionCadence =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'yearly';

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
  tags: string[];
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
  sort_order: number;
  created_at: string;
};

export type SavingsDirection = 'in' | 'out';

export type SavingsTransaction = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: Currency;
  amount_ron: number;
  fx_rate: number | null;
  fx_rate_date: string | null;
  direction: SavingsDirection;
  account_name: string | null;
  occurred_on: string;
  note: string | null;
  tags: string[];
  created_at: string;
};

export type InvestmentDirection = 'in' | 'out';
export type InvestmentInstrumentType =
  | 'pension'
  | 'etf'
  | 'mutual_fund'
  | 'stock'
  | 'bonds'
  | 'crypto'
  | 'real_estate'
  | 'other';

export type InvestmentTransaction = {
  id: string;
  profile_id: string;
  name: string;
  amount: number;
  currency: Currency;
  amount_ron: number;
  fx_rate: number | null;
  fx_rate_date: string | null;
  direction: InvestmentDirection;
  instrument_type: InvestmentInstrumentType;
  broker: string | null;
  occurred_on: string;
  note: string | null;
  tags: string[];
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

export type FeedbackType = 'bug' | 'feature';

export type FeedbackStatus =
  | 'open'
  | 'in_progress'
  | 'fixed'
  | 'wont_fix'
  | 'proposed'
  | 'planned'
  | 'done'
  | 'declined';

export type Feedback = {
  id: string;
  profile_id: string;
  type: FeedbackType;
  title: string;
  body: string | null;
  status: FeedbackStatus;
  votes_count: number;
  created_at: string;
  updated_at: string;
};

export type FeedbackVote = {
  feedback_id: string;
  profile_id: string;
  created_at: string;
};

export type FeedbackNotification = {
  id: string;
  profile_id: string;
  feedback_id: string;
  old_status: FeedbackStatus | null;
  new_status: FeedbackStatus;
  read_at: string | null;
  created_at: string;
};

export type FeedbackComment = {
  id: string;
  feedback_id: string;
  profile_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type BankConnectionStatus = 'active' | 'expired' | 'disconnected' | 'error';

export type BankConnection = {
  id: string;
  profile_id: string;
  provider: 'saltedge';
  provider_requisition_id: string;
  provider_account_id: string;
  institution_id: string;
  institution_name: string;
  iban: string | null;
  status: BankConnectionStatus;
  consent_expires_at: string | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
};

export type BankTransactionStatus = 'pending_review' | 'imported' | 'skipped' | 'ignored';

export type BankTransaction = {
  id: string;
  profile_id: string;
  connection_id: string;
  provider_transaction_id: string;
  booked: boolean;
  amount: number;
  currency: Currency;
  merchant_name: string | null;
  description: string | null;
  occurred_on: string;
  raw: Record<string, unknown> | null;
  matched_rule_id: string | null;
  expense_id: string | null;
  status: BankTransactionStatus;
  created_at: string;
};

export type BankImportRule = {
  id: string;
  profile_id: string;
  keywords: string[];
  category_id: string | null;
  subcategory_id: string | null;
  tags: string[];
  priority: number;
  enabled: boolean;
  created_at: string;
};

