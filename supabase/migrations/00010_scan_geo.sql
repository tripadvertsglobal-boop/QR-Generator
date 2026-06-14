-- Scan geography breakdown for a QR code (scans grouped by country).
-- Ownership re-checked in-body (SECURITY DEFINER bypasses RLS). Owner-only.
CREATE OR REPLACE FUNCTION public.get_scan_geo(
  p_qr_code_id UUID, p_start DATE, p_end DATE
) RETURNS TABLE (country VARCHAR, scan_count BIGINT) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.qr_codes WHERE id = p_qr_code_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT COALESCE(sl.country, 'Unknown')::VARCHAR AS country, COUNT(*)::BIGINT AS scan_count
    FROM public.scan_logs sl
    WHERE sl.qr_code_id = p_qr_code_id
      AND sl.scanned_at >= p_start AND sl.scanned_at < p_end + INTERVAL '1 day'
    GROUP BY COALESCE(sl.country, 'Unknown')
    ORDER BY scan_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_scan_geo(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scan_geo(UUID, DATE, DATE) TO authenticated;
