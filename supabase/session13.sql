-- Session 13: Add logo_url to profiles
-- Stores the public URL of the business/brand logo uploaded to Supabase Storage.
-- The logo is rendered in the top-right corner of generated invoice PDFs.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
