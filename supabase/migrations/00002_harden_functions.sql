-- Harden M1 functions per Supabase security advisors.
-- 1. Pin search_path on the updated_at helper.
-- 2. handle_new_user is a trigger-only SECURITY DEFINER function; it must not be
--    invokable as an RPC by anon/authenticated. Triggers still fire after revoke.
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
