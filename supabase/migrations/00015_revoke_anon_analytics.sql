-- Defense-in-depth: 00004/00010 granted these to authenticated only, but
-- Supabase default privileges also grant EXECUTE to anon on function creation,
-- and REVOKE FROM PUBLIC does not remove that explicit grant. Not exploitable
-- (both RPCs check auth.uid() ownership, which is unset for anon), but the
-- grants should match the declared intent: owner analytics, authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_scan_timeseries(UUID, DATE, DATE) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_scan_geo(UUID, DATE, DATE) FROM anon;
