-- API-key access to scan analytics. get_scan_timeseries enforces ownership via
-- auth.uid(), which is unset under service-role (API-key) auth — so integrations
-- with qrcodes:read could manage codes but never read their timeseries. This
-- variant checks ownership against the key's user id, passed by the API layer
-- from the authenticated key record, and is executable by service_role only.
CREATE OR REPLACE FUNCTION public.get_scan_timeseries_svc(
  p_qr_code_id UUID, p_user_id UUID, p_start DATE, p_end DATE
) RETURNS TABLE (day DATE, scan_count BIGINT) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.qr_codes WHERE id = p_qr_code_id AND user_id = p_user_id
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

-- Supabase default privileges grant EXECUTE to anon/authenticated explicitly,
-- so revoking PUBLIC alone is not enough — revoke them by name.
REVOKE EXECUTE ON FUNCTION public.get_scan_timeseries_svc(UUID, UUID, DATE, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_scan_timeseries_svc(UUID, UUID, DATE, DATE) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_timeseries_svc(UUID, UUID, DATE, DATE) TO service_role;
