-- Milestone 3 — organization: folders + tags on qr_codes.

CREATE TABLE public.folders (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      VARCHAR(7),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_folders_user_name ON public.folders (user_id, name);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_crud_folders" ON public.folders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- qr_codes gains folder membership + tags.
ALTER TABLE public.qr_codes
  ADD COLUMN folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN tags      TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_qr_codes_folder ON public.qr_codes (folder_id);
CREATE INDEX idx_qr_codes_tags   ON public.qr_codes USING GIN (tags);
