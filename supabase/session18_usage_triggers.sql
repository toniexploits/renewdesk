-- Auto-increment usage_tracking whenever an invoice or quote is inserted.
-- This replaces the unused client-side increment functions — the DB now
-- handles counting automatically and cannot be bypassed.

-- ── Invoice trigger ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _increment_invoice_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, billing_month, invoices_created, quotes_created)
  VALUES (NEW.user_id, TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM'), 1, 0)
  ON CONFLICT (user_id, billing_month)
  DO UPDATE SET invoices_created = public.usage_tracking.invoices_created + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_invoice_usage ON public.invoices;
CREATE TRIGGER trg_increment_invoice_usage
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION _increment_invoice_usage();

-- ── Quote trigger ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION _increment_quote_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id, billing_month, invoices_created, quotes_created)
  VALUES (NEW.user_id, TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM'), 0, 1)
  ON CONFLICT (user_id, billing_month)
  DO UPDATE SET quotes_created = public.usage_tracking.quotes_created + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_quote_usage ON public.quotes;
CREATE TRIGGER trg_increment_quote_usage
  AFTER INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION _increment_quote_usage();
