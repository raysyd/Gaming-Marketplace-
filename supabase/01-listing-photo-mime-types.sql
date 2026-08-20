-- Sidegrade — restrict the listing-photos bucket to the formats the
-- uploader and /api/listings already enforce (JPG, PNG, WebP, GIF).
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Client-side validation (components/PhotoUploader.tsx) and the listing
-- count check in app/api/listings/route.ts both stop a normal upload
-- outside these bounds, but neither can stop something uploaded straight
-- to Storage with the anon key bypassing the app entirely — only a bucket
-- setting can.

update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file_size_limit = 8388608 -- 8MB, matches PhotoUploader's client-side check
where id = 'listing-photos';
