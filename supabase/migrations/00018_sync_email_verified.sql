-- user_profiles.email_verified was write-once and therefore always wrong.
--
-- handle_new_user() is AFTER INSERT ON auth.users and reads email_confirmed_at
-- at that instant — which is NULL for every signup while email confirmation is
-- enabled. Nothing ever wrote the column again, so a user who clicked the
-- confirmation link still reported email_verified = false forever, including
-- through GET /api/v1/account.
--
-- Fix: mirror the column when auth.users.email_confirmed_at changes, and
-- backfill the accounts that were already stranded.

CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
     SET email_verified = NEW.email_confirmed_at IS NOT NULL
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger-only, like enforce_api_key_limit() in 00016: Supabase's default
-- privileges would otherwise expose it at /rest/v1/rpc/sync_email_verified.
-- REVOKE FROM PUBLIC alone is not enough — the role grants are explicit.
REVOKE EXECUTE ON FUNCTION public.sync_email_verified()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.sync_email_verified();

-- Backfill every profile that drifted from the auth record. Idempotent.
UPDATE public.user_profiles p
   SET email_verified = (u.email_confirmed_at IS NOT NULL)
  FROM auth.users u
 WHERE u.id = p.id
   AND p.email_verified IS DISTINCT FROM (u.email_confirmed_at IS NOT NULL);
