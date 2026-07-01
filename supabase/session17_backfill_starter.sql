-- Backfill a Starter subscription row for every existing user who doesn't have one.
-- This makes the Starter plan explicit so all constraints are applied consistently.

INSERT INTO public.user_subscriptions (
  user_id,
  plan_name,
  billing_currency,
  billing_interval,
  status,
  cancel_at_period_end
)
SELECT
  p.id,
  'starter',
  COALESCE(p.billing_currency, 'NGN'),
  'monthly',
  'active',
  false
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Backfill a usage_tracking row for the current billing month for every Starter user
-- who doesn't have one yet. This ensures the invoice/quote counter starts tracking
-- from now (it does not retroactively count past invoices — that's intentional).

INSERT INTO public.usage_tracking (user_id, billing_month, invoices_created, quotes_created)
SELECT
  us.user_id,
  TO_CHAR(NOW(), 'YYYY-MM'),
  0,
  0
FROM public.user_subscriptions us
WHERE us.plan_name = 'starter'
  AND us.user_id NOT IN (
    SELECT user_id FROM public.usage_tracking
    WHERE billing_month = TO_CHAR(NOW(), 'YYYY-MM')
  )
ON CONFLICT (user_id, billing_month) DO NOTHING;
