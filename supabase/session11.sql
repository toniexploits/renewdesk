-- ============================================================
-- SESSION 11: Subscription System
-- Run these in order in the Supabase SQL editor
-- ============================================================

-- ── 1. Add billing_currency to profiles ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'starter';

-- ── 2. subscription_plans table (seed data only) ─────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL UNIQUE,
  display_name        text NOT NULL,
  monthly_price_ngn   numeric NOT NULL DEFAULT 0,
  yearly_price_ngn    numeric NOT NULL DEFAULT 0,
  monthly_price_usd   numeric NOT NULL DEFAULT 0,
  yearly_price_usd    numeric NOT NULL DEFAULT 0,
  invoice_limit       integer,        -- null = unlimited
  quote_limit         integer,
  bank_account_limit  integer,
  features            jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Seed plans
INSERT INTO public.subscription_plans
  (name, display_name, monthly_price_ngn, yearly_price_ngn,
   monthly_price_usd, yearly_price_usd,
   invoice_limit, quote_limit, bank_account_limit, features)
VALUES
  ('starter', 'Starter', 0, 0, 0, 0, 5, 3, 1,
   '["pdf_download","whatsapp_sharing"]'::jsonb),
  ('pro', 'Pro', 5000, 45000, 5, 50, NULL, NULL, 5,
   '["pdf_download","whatsapp_sharing","email_sending","receipt_conversion",
     "quote_to_invoice","duplicate_invoice","multiple_bank_accounts","remove_branding"]'::jsonb),
  ('agency', 'Agency', 15000, 135000, 15, 150, NULL, NULL, NULL,
   '["pdf_download","whatsapp_sharing","email_sending","receipt_conversion",
     "quote_to_invoice","duplicate_invoice","multiple_bank_accounts","remove_branding",
     "team_members","custom_templates","advanced_analytics"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ── 3. user_subscriptions table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_name                    text NOT NULL DEFAULT 'starter',
  billing_currency             text NOT NULL DEFAULT 'NGN',
  billing_interval             text NOT NULL DEFAULT 'monthly',
  status                       text NOT NULL DEFAULT 'active',
  paystack_customer_code       text,
  paystack_subscription_code   text,
  paystack_plan_code           text,
  current_period_start         timestamptz,
  current_period_end           timestamptz,
  cancel_at_period_end         boolean NOT NULL DEFAULT false,
  cancelled_at                 timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscription_plan_check CHECK (plan_name IN ('starter','pro','agency')),
  CONSTRAINT subscription_currency_check CHECK (billing_currency IN ('NGN','USD')),
  CONSTRAINT subscription_interval_check CHECK (billing_interval IN ('monthly','yearly')),
  CONSTRAINT subscription_status_check CHECK (status IN ('active','cancelled','past_due','trialing'))
);

-- ── 4. usage_tracking table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_month     text NOT NULL,          -- format: YYYY-MM
  invoices_created  integer NOT NULL DEFAULT 0,
  quotes_created    integer NOT NULL DEFAULT 0,
  reset_at          timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, billing_month)
);

-- ── 5. RLS ────────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Everyone can read plan definitions
CREATE POLICY "plans_readable_by_all"
  ON public.subscription_plans FOR SELECT USING (true);

-- Users can read/write their own subscription
CREATE POLICY "users_own_subscription_select"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_subscription_update"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do anything (webhooks)
CREATE POLICY "service_role_subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Users can read/write their own usage
CREATE POLICY "users_own_usage_select"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_usage"
  ON public.usage_tracking FOR ALL
  USING (auth.role() = 'service_role');

-- ── 6. Helper RPC functions for usage tracking ───────────────
CREATE OR REPLACE FUNCTION public.increment_invoice_count(p_user_id uuid, p_month text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, billing_month, invoices_created, updated_at)
  VALUES (p_user_id, p_month, 1, now())
  ON CONFLICT (user_id, billing_month)
  DO UPDATE SET
    invoices_created = usage_tracking.invoices_created + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_quote_count(p_user_id uuid, p_month text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, billing_month, quotes_created, updated_at)
  VALUES (p_user_id, p_month, 1, now())
  ON CONFLICT (user_id, billing_month)
  DO UPDATE SET
    quotes_created = usage_tracking.quotes_created + 1,
    updated_at = now();
END;
$$;

-- ── 7. Extend new-user trigger to create starter subscription
--      and usage_tracking row ──────────────────────────────────
-- First, find your existing trigger function (likely called
-- handle_new_user or similar). Replace/extend it:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _currency text;
  _month text;
BEGIN
  -- Pull billing currency from signup metadata if provided
  _currency := COALESCE(
    new.raw_user_meta_data->>'billing_currency',
    'NGN'
  );

  -- Insert profile row
  INSERT INTO public.profiles (id, full_name, billing_currency, updated_at)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    _currency,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    billing_currency = EXCLUDED.billing_currency,
    updated_at = now();

  -- Create starter subscription
  INSERT INTO public.user_subscriptions
    (user_id, plan_name, billing_currency, billing_interval, status)
  VALUES
    (new.id, 'starter', _currency, 'monthly', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create usage tracking for current month
  _month := to_char(now(), 'YYYY-MM');
  INSERT INTO public.usage_tracking (user_id, billing_month, reset_at)
  VALUES (new.id, _month, now())
  ON CONFLICT (user_id, billing_month) DO NOTHING;

  RETURN new;
END;
$$;

-- Make sure the trigger exists on auth.users
-- (If the trigger already exists, drop and recreate it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 8. Backfill existing users (run once) ────────────────────
INSERT INTO public.user_subscriptions (user_id, plan_name, billing_currency, billing_interval, status)
SELECT id, 'starter', COALESCE(billing_currency, 'NGN'), 'monthly', 'active'
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.usage_tracking (user_id, billing_month, invoices_created, quotes_created)
SELECT id, to_char(now(), 'YYYY-MM'), 0, 0
FROM public.profiles
ON CONFLICT (user_id, billing_month) DO NOTHING;
