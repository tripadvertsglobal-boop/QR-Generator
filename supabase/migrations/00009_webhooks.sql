-- Milestone 7.4 — webhooks: HMAC-signed event delivery on mutation + scan.threshold.

CREATE TABLE public.webhooks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  events            TEXT[] NOT NULL,           -- e.g. ['qr.created','scan.threshold']
  secret            TEXT NOT NULL,             -- HMAC signing secret (owner-readable)
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count     INTEGER NOT NULL DEFAULT 0, -- auto-disabled after 10 consecutive
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_webhooks_user ON public.webhooks (user_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_crud_webhooks" ON public.webhooks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- record_scan now returns the new scan_count + owner so the redirect can detect
-- a scan.threshold crossing and dispatch a webhook (fire-and-forget).
DROP FUNCTION IF EXISTS public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.record_scan(
  p_slug    TEXT,
  p_country TEXT DEFAULT NULL,
  p_region  TEXT DEFAULT NULL,
  p_city    TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL
) RETURNS TABLE (scan_count BIGINT, user_id UUID) AS $$
DECLARE
  v_id      UUID;
  v_user    UUID;
  v_count   BIGINT;
BEGIN
  SELECT id, qr_codes.user_id INTO v_id, v_user FROM public.qr_codes
    WHERE short_slug = p_slug AND is_active = true;
  IF v_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.scan_logs (qr_code_id, short_slug, country, region, city, referer)
    VALUES (v_id, p_slug, p_country, p_region, p_city, p_referer);
  UPDATE public.qr_codes SET scan_count = qr_codes.scan_count + 1
    WHERE id = v_id
    RETURNING qr_codes.scan_count INTO v_count;
  RETURN QUERY SELECT v_count, v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
