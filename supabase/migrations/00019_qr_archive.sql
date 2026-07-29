-- Archiving: retire a QR code without destroying it.
--
-- Distinct from is_active (pause), which is a temporary hold that keeps the code
-- in the owner's working list. Archiving retires it: the code drops out of the
-- default list view, stops resolving, and keeps its slug reserved forever so an
-- old printed code can never be silently inherited by a newly created one.
-- Delete still exists and still hard-purges; archive is the non-destructive path.

ALTER TABLE public.qr_codes
  ADD COLUMN archived_at TIMESTAMPTZ;

-- Every list view and the plan-quota count filter on "not archived", and the
-- overwhelming majority of rows stay unarchived — so a partial index on the live
-- set is both smaller and the one that actually gets used.
CREATE INDEX qr_codes_user_live_idx
  ON public.qr_codes (user_id, created_at DESC)
  WHERE archived_at IS NULL;

-- The edge resolver must treat archived as not-live. Folding it into the
-- returned is_active (rather than adding a column) means the edge computes the
-- existing "paused" terminal state and serves its 410 with no client change.
--
-- Note this also keeps the 00012 guarantee intact: destination_url and
-- ab_destinations stay NULL unless the code is genuinely live, so archiving a
-- code stops disclosing its destination to anonymous callers.
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
              AND q.archived_at IS NULL
              AND (q.active_from IS NULL OR q.active_from <= now())
              AND (q.active_until IS NULL OR q.active_until > now())
         THEN q.destination_url END,
    q.is_active AND q.archived_at IS NULL,
    q.active_from,
    q.active_until,
    q.password_hash IS NOT NULL AS has_password,
    CASE WHEN q.is_active
              AND q.archived_at IS NULL
              AND (q.active_from IS NULL OR q.active_from <= now())
              AND (q.active_until IS NULL OR q.active_until > now())
         THEN q.ab_destinations END
  FROM public.qr_codes q
  WHERE q.short_slug = p_slug
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_slug_config(TEXT) TO anon, authenticated;
