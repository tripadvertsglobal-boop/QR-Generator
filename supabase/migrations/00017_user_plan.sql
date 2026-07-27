-- Plan tier per account, so the limits advertised on /pricing are actually
-- enforced. Billing does not exist yet: everyone starts on 'free' and an
-- operator upgrades an account by setting this column directly. When Stripe
-- lands it writes this same column, so nothing downstream has to change.
ALTER TABLE public.user_profiles
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro', 'business'));

-- The owner_crud_profile policy is FOR ALL, so without this an authenticated
-- user could PATCH /rest/v1/user_profiles directly with the anon key and grant
-- themselves 'business'. RLS gates *rows*, not *columns* — the column grant is
-- what stops self-upgrade. Only the fields the account API actually writes stay
-- updatable; plan and email_verified become service-role-only.
REVOKE UPDATE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url, timezone) ON public.user_profiles TO authenticated;

-- Backfill any auth user with no profile row. This is possible for accounts
-- created before 00001 installed the on_auth_user_created trigger — production
-- had exactly one (signed up five minutes before the migration ran). Without a
-- row, getPlan() fails closed to 'free' and the account silently loses access.
-- Idempotent, so it is safe on an environment that has nothing to fix.
INSERT INTO public.user_profiles (id, display_name, email_verified)
SELECT u.id,
       u.raw_user_meta_data->>'display_name',
       u.email_confirmed_at IS NOT NULL
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id);
