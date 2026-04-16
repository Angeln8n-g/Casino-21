-- Add audio_url column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for event assets if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('event_assets', 'event_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event_assets
-- 1. Public can read
DROP POLICY IF EXISTS "Public Access Event Assets" ON storage.objects;
CREATE POLICY "Public Access Event Assets" ON storage.objects FOR SELECT USING (bucket_id = 'event_assets');

-- 2. Admins can upload/update/delete
-- We check is_admin column in profiles table
DROP POLICY IF EXISTS "Admin Upload Event Assets" ON storage.objects;
CREATE POLICY "Admin Upload Event Assets" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'event_assets' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Admin Update Event Assets" ON storage.objects;
CREATE POLICY "Admin Update Event Assets" ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'event_assets' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

DROP POLICY IF EXISTS "Admin Delete Event Assets" ON storage.objects;
CREATE POLICY "Admin Delete Event Assets" ON storage.objects FOR DELETE 
USING (
  bucket_id = 'event_assets' AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);
