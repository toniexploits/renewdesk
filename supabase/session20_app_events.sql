-- Feature usage event log. Populated by the app whenever a key action occurs.
-- Only service-role (admin) reads; users can only insert their own rows.

CREATE TABLE IF NOT EXISTS app_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,  -- 'pdf_download' | 'whatsapp_send' | 'email_send'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_events"
  ON app_events FOR INSERT
  WITH CHECK (user_id = auth.uid());
