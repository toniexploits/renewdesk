-- Add unique constraint on source_invoice_id so the setup route can upsert
-- (one recurring schedule per source invoice).
ALTER TABLE recurring_invoices
  ADD CONSTRAINT recurring_invoices_source_invoice_id_key UNIQUE (source_invoice_id);
