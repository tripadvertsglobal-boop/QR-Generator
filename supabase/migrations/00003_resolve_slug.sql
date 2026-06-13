-- Redirect fallback path (plan M1.7). On a KV cache miss the edge redirect needs
-- to resolve slug -> destination WITHOUT shipping the service_role key to the edge.
-- A SECURITY DEFINER RPC exposes only the destination of an *active* code to anon,
-- never the whole row. A scan resolving its own destination is inherently public.
CREATE OR REPLACE FUNCTION public.resolve_slug(p_slug TEXT)
RETURNS TABLE (destination_url TEXT) AS $$
  SELECT destination_url
  FROM public.qr_codes
  WHERE short_slug = p_slug AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.resolve_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_slug(TEXT) TO anon, authenticated;
