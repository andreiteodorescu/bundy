-- Adds the `company_card_enabled` setting to profile.settings (jsonb).
-- Idempotent: safe to re-run.
--
-- Default for new profiles is "off" (no company-card UI shown). Existing profiles
-- that have already used the feature (any expense / subscription / loan / template
-- tagged 'company-card') are grandfathered to "on" so their existing UX is preserved.

-- Grandfather profiles with existing company-card data.
UPDATE profiles
SET settings = COALESCE(settings, '{}'::jsonb) || '{"company_card_enabled": true}'::jsonb
WHERE id IN (
  SELECT DISTINCT profile_id FROM expenses              WHERE 'company-card' = ANY(tags)
  UNION
  SELECT DISTINCT profile_id FROM subscriptions         WHERE 'company-card' = ANY(tags)
  UNION
  SELECT DISTINCT profile_id FROM loans                 WHERE 'company-card' = ANY(tags)
  UNION
  SELECT DISTINCT profile_id FROM fixed_expenses        WHERE 'company-card' = ANY(tags)
  UNION
  SELECT DISTINCT profile_id FROM quick_expenses        WHERE 'company-card' = ANY(tags)
  UNION
  SELECT DISTINCT profile_id FROM predefined_expenses   WHERE 'company-card' = ANY(tags)
)
AND (settings IS NULL OR NOT (settings ? 'company_card_enabled'));
