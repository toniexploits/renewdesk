-- Grant the super_admin user an active Agency plan subscription.
-- Safe to re-run: uses INSERT ... ON CONFLICT DO UPDATE.

INSERT INTO public.user_subscriptions (
  user_id,
  plan_name,
  billing_currency,
  billing_interval,
  status,
  cancel_at_period_end,
  updated_at
)
SELECT
  id,
  'agency',
  'NGN',
  'yearly',
  'active',
  false,
  now()
FROM public.profiles
WHERE role = 'super_admin'
LIMIT 1
ON CONFLICT (user_id) DO UPDATE
  SET plan_name            = 'agency',
      status               = 'active',
      cancel_at_period_end = false,
      updated_at           = now();
