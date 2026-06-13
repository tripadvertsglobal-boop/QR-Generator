-- Milestone 5 — developer platform: API keys + audit log.

CREATE TABLE public.api_keys (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,            -- SHA-256 of the raw key, never plaintext
  key_prefix   VARCHAR(12) NOT NULL,            -- e.g. 'qr_sk_a3f1' for display + secret scanners
  scopes       TEXT[] NOT NULL DEFAULT '{qrcodes:read,qrcodes:write}',
  rate_limit   INTEGER NOT NULL DEFAULT 100,    -- req/min
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,                     -- NULL = never
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_api_keys_hash ON public.api_keys (key_hash);
CREATE INDEX idx_api_keys_user ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_crud_keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.audit_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,                  -- 'qr.create', 'key.create', ...
  resource_type TEXT NOT NULL,                  -- 'qr_code', 'api_key', ...
  resource_id   UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_user_time ON public.audit_logs (user_id, created_at DESC);

-- Owners can read their own audit trail; writes happen via service_role only.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_audit" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);
