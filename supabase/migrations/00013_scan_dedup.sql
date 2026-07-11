-- Scan integrity — dedup rapid repeat hits by hashed IP.
-- The redirect now passes a keyed IP hash; record_scan collapses repeat scans
-- from the same source within a short window (technical double-fires, prefetch,
-- reload storms) so scan_count reflects distinct scans. Bot/preview user-agents
-- are filtered upstream at the edge and never reach this function.
-- Backward compatible: p_ip_hash defaults NULL, so callers that omit it (older
-- deployments) still record scans, just without dedup.

DROP FUNCTION IF EXISTS public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.record_scan(
  p_slug    TEXT,
  p_country TEXT DEFAULT NULL,
  p_region  TEXT DEFAULT NULL,
  p_city    TEXT DEFAULT NULL,
  p_referer TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
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

  -- Dedup: a scan from the same source within the last 10s is a technical
  -- repeat, not a new scan. Return no row so the caller bumps neither the
  -- counter nor a threshold webhook.
  IF p_ip_hash IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.scan_logs
    WHERE qr_code_id = v_id AND ip_hash = p_ip_hash
      AND scanned_at > now() - INTERVAL '10 seconds'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.scan_logs (qr_code_id, short_slug, country, region, city, referer, ip_hash)
    VALUES (v_id, p_slug, p_country, p_region, p_city, p_referer, p_ip_hash);
  UPDATE public.qr_codes SET scan_count = qr_codes.scan_count + 1
    WHERE id = v_id
    RETURNING qr_codes.scan_count INTO v_count;
  RETURN QUERY SELECT v_count, v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_scan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
