-- Recurring invoices — stores a schedule + template that fires on a cadence.
-- The cron job at /api/recurring/process reads this table daily and
-- generates new invoices for any schedule where next_due_date <= today.

CREATE TABLE IF NOT EXISTS recurring_invoices (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Template (copied from source invoice)
  client_name           TEXT        NOT NULL,
  client_email          TEXT,
  client_phone          TEXT,
  contact_name          TEXT,
  service_name          TEXT,
  service_plan          TEXT,
  line_items            JSONB       NOT NULL DEFAULT '[]',
  tax_rate              NUMERIC     NOT NULL DEFAULT 0,
  currency              TEXT        NOT NULL DEFAULT 'NGN',
  notes                 TEXT,
  bank_account_id       UUID,
  bank_details_snapshot JSONB,
  -- Schedule
  frequency             TEXT        NOT NULL CHECK (frequency IN ('monthly','quarterly','yearly')),
  next_due_date         DATE        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled')),
  -- Origin
  source_invoice_id     UUID        REFERENCES invoices(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_recurring"
  ON recurring_invoices FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_member_select_recurring"
  ON recurring_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = recurring_invoices.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );
