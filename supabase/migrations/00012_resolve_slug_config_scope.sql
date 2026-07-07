-- Security hardening: resolve_slug_config is anon-callable so the edge can
-- resolve any slug (including returning 410/404 for paused/expired/not-yet-active
-- codes). Previously it returned destination_url + ab_destinations for ANY slug,
-- disclosing the destination of codes the owner has paused or scheduled for later.
--
-- Redefine it to expose destination_url/ab_destinations ONLY when the code is
-- currently live (active and within its schedule window). The scheduling/active
-- fields are still returned unconditionally so the edge can compute the correct
-- terminal state (paused/expired/not-started) without seeing the destination.

CREATE OR REPLACE FUNCTION public.resolve_slug_config(p_slug TEXT)
RETURNS TABLE (
  destination_url TEXT,
  is_active       BOOLEAN,
  active_from     TIMESTAMPTZ,
  active_until    TIMESTAMPTZ,
  has_password    BOOLEAN,
  ab_destinations JSONB
) AS $$
  SELECT
    CASE WHEN q.is_active
              AND (q.active_from IS NULL OR q.active_from <= now())
              AND (q.active_until IS NULL OR q.active_until > now())
         THEN q.destination_url END,
    q.is_active,
    q.active_from,
    q.active_until,
    q.password_hash IS NOT NULL AS has_password,
    CASE WHEN q.is_active
              AND (q.active_from IS NULL OR q.active_from <= now())
              AND (q.active_until IS NULL OR q.active_until > now())
         THEN q.ab_destinations END
  FROM public.qr_codes q
  WHERE q.short_slug = p_slug
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) TO anon, authenticated;
