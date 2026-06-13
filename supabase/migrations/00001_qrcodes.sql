-- Milestone 1 — Core loop schema: qr_codes + minimal user_profiles + auto-profile trigger.
-- Scoped deliberately to M1 (plan Appendix A). Later columns/tables arrive in the
-- milestone that uses them. Do NOT add folders/tags/scan_logs/scheduling here.

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- user_profiles — created by the auth signup trigger (plan M1.1)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name   TEXT,
  avatar_url     TEXT,
  timezone       TEXT DEFAULT 'UTC',
  email_verified BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_crud_profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, email_verified)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', NEW.email_confirmed_at IS NOT NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- qr_codes — M1 minimal shape (grows in later milestones; see plan Appendix A)
-- ---------------------------------------------------------------------------
CREATE TABLE public.qr_codes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_slug      VARCHAR(12) NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  name            TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_qr_codes_user ON public.qr_codes (user_id);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_insert" ON public.qr_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_select" ON public.qr_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner_update" ON public.qr_codes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner_delete" ON public.qr_codes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_qr_codes_updated_at
  BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
