-- ============================================================
-- SESSION 12: Recurring billing + cancel token support
-- Run in Supabase SQL editor
-- ============================================================

-- Store Paystack plan codes per currency/interval so we don't recreate them
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS paystack_plan_codes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Store the email_token from subscription.create webhook — required to cancel
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS paystack_email_token text;
