-- Migration 0010: File uploads — task_attachments column + storage bucket setup
-- Run this in: Supabase Dashboard → SQL Editor

-- 1. Add file_urls column to submissions (stores public URLs of uploaded deliverables)
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS file_urls text[] NOT NULL DEFAULT '{}';

-- 2. Create task_attachments table (files attached when posting a task)
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url    text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Ensure all columns exist even if table was created in a partial prior run
ALTER TABLE public.task_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.task_attachments
  ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.task_attachments
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS task_attachments_task_id_idx ON public.task_attachments(task_id);

-- 3. RLS for task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_attachments_select" ON public.task_attachments;
CREATE POLICY "task_attachments_select"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_attachments_insert" ON public.task_attachments;
CREATE POLICY "task_attachments_insert"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "task_attachments_delete" ON public.task_attachments;
CREATE POLICY "task_attachments_delete"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- ==========================================================
-- 4. Storage bucket setup
-- Run these in Supabase Dashboard → Storage → New bucket:
--
--  Name:     campusgig-uploads
--  Public:   YES (public bucket so URLs work without signing)
--  File size limit: 10485760 (10 MB)
--  Allowed MIME types: (leave empty to allow all, or set below)
--
-- OR run via SQL:
-- ==========================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campusgig-uploads',
  'campusgig-uploads',
  true,
  10485760,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies (allow authenticated users to upload to their own folder)
DROP POLICY IF EXISTS "storage_upload_own_folder" ON storage.objects;
CREATE POLICY "storage_upload_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'campusgig-uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "storage_read_public" ON storage.objects;
CREATE POLICY "storage_read_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'campusgig-uploads');

DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'campusgig-uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
