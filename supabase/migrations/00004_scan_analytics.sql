-- Milestone 2 — editable links + scan analytics.
-- scan_logs is a plain (non-partitioned) table here; partitioning is a M4 concern.

-- Denormalized counter on qr_codes (async-incremented per scan).
ALTER TABLE public.qr_codes ADD COLUMN scan_count BIGINT NOT NULL DEFAULT 0;

-- Raw scan event store.
CREATE TABLE public.scan_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id  UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  short_slug  VARCHAR(12) NOT NULL,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  country     VARCHAR(2),
  region      TEXT,
  city        TEXT,
  device_type TEXT,
  referer     TEXT,
  ip_hash     TEXT
);
CREATE INDEX idx_scan_logs_qr ON public.scan_logs (qr_code_id, scanned_at DESC);

-- Owners may read their own scans (via ownership join). Writes are NOT granted to
-- anon/authenticated — they go through the SECURITY DEFINER record_scan RPC below.
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_read_scans" ON public.scan_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.qr_codes
    WHERE qr_codes.id = scan_logs.qr_code_id AND qr_codes.user_id = auth.uid()
  ));

-- Record a scan from the (unauthenticated) redirect path without shipping
-- service_role to the edge. Inserts the event + bumps the denormalized counter.
CREATE OR REPLACE FUNCTION public.record_scan(
  p_slug    TEXT,
  p_country TEXT DEFAULT NULL,
  p_region  TEXT DEFAULT NULL,
  p_city    TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.qr_codes
    WHERE short_slug = p_slug AND is_active = true;
  IF v_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.scan_logs (qr_code_id, short_slug, country, region, city, referer)
    VALUES (v_id, p_slug, p_country, p_region, p_city, p_referer);
  UPDATE public.qr_codes SET scan_count = scan_count + 1 WHERE id = v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Per-day scan timeseries for a QR code; re-checks ownership (SECURITY DEFINER
-- bypasses RLS). Owner-only — granted to authenticated.
CREATE OR REPLACE FUNCTION public.get_scan_timeseries(
  p_qr_code_id UUID, p_start DATE, p_end DATE
) RETURNS TABLE (day DATE, scan_count BIGINT) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.qr_codes WHERE id = p_qr_code_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT DATE(sl.scanned_at) AS day, COUNT(*)::BIGINT AS scan_count
    FROM public.scan_logs sl
    WHERE sl.qr_code_id = p_qr_code_id
      AND sl.scanned_at >= p_start AND sl.scanned_at < p_end + INTERVAL '1 day'
    GROUP BY DATE(sl.scanned_at) ORDER BY day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_scan_timeseries(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scan_timeseries(UUID, DATE, DATE) TO authenticated;
