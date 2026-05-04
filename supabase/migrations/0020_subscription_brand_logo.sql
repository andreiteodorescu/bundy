-- Optional brand logo override on subscriptions. NULL = auto-detect from name.
-- Non-null = use the specified brand slug (e.g. 'netflix') from src/data/brandLogos.ts.

alter table public.subscriptions
  add column if not exists brand_logo text;
