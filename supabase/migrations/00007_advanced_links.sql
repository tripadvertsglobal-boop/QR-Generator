-- Milestone 7 — advanced link features on qr_codes:
-- scheduling, password gate, A/B split. The redirect engine now resolves the
-- full config in one read, so resolve_slug is replaced by resolve_slug_config.

ALTER TABLE public.qr_codes
  ADD COLUMN active_from     TIMESTAMPTZ,   -- NULL = active immediately
  ADD COLUMN active_until    TIMESTAMPTZ,   -- NULL = never expires
  ADD COLUMN password_hash   TEXT,          -- bcrypt; NULL = no password
  ADD COLUMN ab_destinations JSONB;         -- [{"url":"...","weight":50}] or NULL

-- Full redirect config for a slug (any state, so the edge can return 410 for
-- paused/expired). Exposes only public redirect data — never the password hash.
DROP FUNCTION IF EXISTS public.resolve_slug(TEXT);

CREATE OR REPLACE FUNCTION public.resolve_slug_config(p_slug TEXT)
RETURNS TABLE (
  destination_url TEXT,
  is_active       BOOLEAN,
  active_from     TIMESTAMPTZ,
  active_until    TIMESTAMPTZ,
  has_password    BOOLEAN,
  ab_destinations JSONB
) AS $$
  SELECT destination_url, is_active, active_from, active_until,
         password_hash IS NOT NULL AS has_password, ab_destinations
  FROM public.qr_codes
  WHERE short_slug = p_slug
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) TO anon, authenticated;

-- The password-unlock interstitial needs to read the hash server-side (node) to
-- verify a submitted password. Returns the bcrypt hash for an active, in-window
-- slug only. anon-callable; the hash is bcrypt so exposure is low-risk, but it
-- only returns for slugs that actually gate on a password.
CREATE OR REPLACE FUNCTION public.get_password_hash(p_slug TEXT)
RETURNS TABLE (password_hash TEXT, destination_url TEXT) AS $$
  SELECT password_hash, destination_url
  FROM public.qr_codes
  WHERE short_slug = p_slug AND is_active = true AND password_hash IS NOT NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_password_hash(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_password_hash(TEXT) TO anon, authenticated;
