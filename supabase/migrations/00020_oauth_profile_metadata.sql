-- handle_new_user() read raw_user_meta_data->>'display_name' and never wrote
-- avatar_url at all. No OAuth provider sets 'display_name': Google supplies the
-- name under 'full_name' (and 'name') and the picture under 'avatar_url' (and
-- 'picture'). So every Google signup landed with a blank name and no picture,
-- confirmed on the first live Google sign-in.
--
-- Fix: read the provider keys in preference order at signup, and backfill the
-- accounts already created.
--
-- Deliberately signup-only. Providers refresh raw_user_meta_data on every
-- sign-in, so mirroring it on UPDATE the way 00018 does for email_verified
-- would silently revert a display name the user had since edited. First write
-- wins; the user owns the field afterwards.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    -- NULLIF so a provider sending "" leaves the column NULL rather than blank.
    NULLIF(COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ), ''),
    NULLIF(COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ), ''),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger-only, as established in 00002. CREATE OR REPLACE preserves existing
-- grants, so this is belt-and-braces — but it keeps the guarantee visible next
-- to the definition and is idempotent.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- Backfill. COALESCE on the existing value means a name the user has already
-- set is never clobbered; the WHERE limits the write to rows still missing
-- something. Idempotent.
UPDATE public.user_profiles p
   SET display_name = COALESCE(p.display_name, NULLIF(COALESCE(
         u.raw_user_meta_data->>'display_name',
         u.raw_user_meta_data->>'full_name',
         u.raw_user_meta_data->>'name'
       ), '')),
       avatar_url = COALESCE(p.avatar_url, NULLIF(COALESCE(
         u.raw_user_meta_data->>'avatar_url',
         u.raw_user_meta_data->>'picture'
       ), ''))
  FROM auth.users u
 WHERE u.id = p.id
   AND (p.display_name IS NULL OR p.avatar_url IS NULL);
