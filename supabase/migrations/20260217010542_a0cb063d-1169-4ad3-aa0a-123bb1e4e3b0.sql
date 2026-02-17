
-- Add brand columns to workspaces
ALTER TABLE public.workspaces
ADD COLUMN logo_url text,
ADD COLUMN primary_color text DEFAULT '#2563EB',
ADD COLUMN secondary_color text DEFAULT '#0EA5E9';

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Storage policies for logos
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Workspace members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Workspace members can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos');

CREATE POLICY "Workspace members can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos');
