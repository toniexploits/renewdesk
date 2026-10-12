-- ── Session 28: Optional invoice discount ───────────────────────────────────
-- Discount is applied to the subtotal before tax.
--   discount_type   'percent' | 'fixed'
--   discount_value  the number the user entered (e.g. 10 for 10%, or 5000 for a fixed amount)
--   discount_amount the computed amount deducted, in the invoice currency

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_type   TEXT    NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_value  NUMERIC NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
