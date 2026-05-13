-- Swap GoCardless → Salt Edge as the Open Banking provider.
--
-- Salt Edge requires a "customer" resource per end-user (created once, reused
-- across all connections). We store the Salt Edge customer ID on the profile.
--
-- Existing bank_connections / bank_pending_requisitions schema is reused as-is:
--   - bank_connections.provider_requisition_id  → Salt Edge connection_id
--   - bank_connections.provider_account_id      → Salt Edge account_id
--   - bank_pending_requisitions.requisition_id  → Salt Edge connect_session token
--   - bank_pending_requisitions.institution_id  → Salt Edge provider_code
--
-- (No existing GoCardless data — feature flag was always off — so no backfill.)
--
-- Idempotent.

alter table public.profiles
  add column if not exists saltedge_customer_id text;

alter table public.bank_connections
  alter column provider set default 'saltedge';
