-- Session 14: Partial payments
-- Tracks individual payment instalments against an invoice.
-- amount_paid is denormalised onto invoices for fast list display.

CREATE TABLE IF NOT EXISTS invoice_payments (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id       UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency      TEXT           NOT NULL DEFAULT 'NGN',
  payment_date  DATE           NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now()
);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payments"
  ON invoice_payments FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Cached running total so the invoice list doesn't need a join
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0;
