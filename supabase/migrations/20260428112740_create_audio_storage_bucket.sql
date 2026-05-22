/*
  # Create audio-files storage bucket

  1. Storage Setup
    - Create 'audio-files' bucket for storing uploaded MP3/audio files
    - Enable RLS for the bucket
    - Add policies for authenticated uploads and public downloads

  2. Policies
    - Allow authenticated users to upload files
    - Allow public access to read files
*/

-- This migration creates the storage bucket via RLS policies on storage.objects
-- The bucket itself needs to be created via Supabase dashboard or API
-- For now, we'll set up the RLS policies that will apply once the bucket exists

CREATE POLICY "Authenticated users can upload audio files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-files'
    AND (storage.foldername(name))[1] = 'uploads'
  );

CREATE POLICY "Allow public downloads of audio files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'audio-files');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-files'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
