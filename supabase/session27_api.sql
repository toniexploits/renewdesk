-- ── Session 27: Public REST API ─────────────────────────────────────────────

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_prefix   TEXT        NOT NULL,          -- first 20 chars for DB lookup
  key_hash     TEXT        NOT NULL,          -- bcrypt hash — never expose
  last_four    TEXT        NOT NULL,          -- last 4 chars for UI display
  scopes       TEXT[]      NOT NULL DEFAULT '{}',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_api_keys"
  ON api_keys FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_user   ON api_keys(user_id);

-- API Request Log (no RLS — service role only)
CREATE TABLE IF NOT EXISTS api_requests_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      UUID        REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint        TEXT,
  method          TEXT,
  status_code     INTEGER,
  response_time_ms INTEGER,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for rate limiting (recent requests per key)
CREATE INDEX IF NOT EXISTS idx_api_log_key_time
  ON api_requests_log(api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_log_user_time
  ON api_requests_log(user_id, created_at DESC);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  events     TEXT[]      NOT NULL DEFAULT '{}',
  secret     TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_webhooks"
  ON webhooks FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);

-- Webhook Deliveries (no RLS — service role only)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID        REFERENCES webhooks(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event           TEXT        NOT NULL,
  payload         JSONB,
  status          TEXT        NOT NULL DEFAULT 'pending', -- pending|delivered|failed
  attempts        INTEGER     NOT NULL DEFAULT 0,
  response_status INTEGER,
  response_body   TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries(webhook_id, created_at DESC);
