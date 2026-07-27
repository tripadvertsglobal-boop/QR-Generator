-- Two fixes surfaced by the Supabase advisors before production launch.
--
-- 1. enforce_api_key_limit() is a trigger-only SECURITY DEFINER function, but
--    Supabase's default privileges grant EXECUTE to anon/authenticated when a
--    function is created — so it was reachable at
--    /rest/v1/rpc/enforce_api_key_limit. Same class as the handle_new_user fix
--    in 00002. REVOKE FROM PUBLIC alone is NOT enough: the anon/authenticated
--    grants are explicit and must be named.
REVOKE EXECUTE ON FUNCTION public.enforce_api_key_limit()
  FROM PUBLIC, anon, authenticated;

-- 2. RLS initplan: a bare auth.uid() in a policy is re-evaluated once per row.
--    Wrapping it in a scalar subquery lets Postgres hoist it to an InitPlan and
--    evaluate it once per statement. Behaviour is identical; this is purely a
--    query-plan fix, and it matters most on scan_logs, which grows unbounded.
DROP POLICY "owner_crud_profile" ON public.user_profiles;
CREATE POLICY "owner_crud_profile" ON public.user_profiles
  FOR ALL USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY "owner_insert" ON public.qr_codes;
CREATE POLICY "owner_insert" ON public.qr_codes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_select" ON public.qr_codes;
CREATE POLICY "owner_select" ON public.qr_codes
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_update" ON public.qr_codes;
CREATE POLICY "owner_update" ON public.qr_codes
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_delete" ON public.qr_codes;
CREATE POLICY "owner_delete" ON public.qr_codes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_read_scans" ON public.scan_logs;
CREATE POLICY "owner_read_scans" ON public.scan_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.qr_codes
      WHERE qr_codes.id = scan_logs.qr_code_id
        AND qr_codes.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY "owner_crud_folders" ON public.folders;
CREATE POLICY "owner_crud_folders" ON public.folders
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_crud_keys" ON public.api_keys;
CREATE POLICY "owner_crud_keys" ON public.api_keys
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_read_audit" ON public.audit_logs;
CREATE POLICY "owner_read_audit" ON public.audit_logs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY "owner_crud_webhooks" ON public.webhooks;
CREATE POLICY "owner_crud_webhooks" ON public.webhooks
  FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
