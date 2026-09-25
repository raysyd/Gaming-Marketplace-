-- Sidegrade — photos in chat.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- A private bucket (unlike listing-photos): a photo sent in a conversation
-- is only ever readable by the two people in it, via short-lived signed
-- URLs. Objects live at <conversation id>/<random uuid>.<ext>, and the
-- policies below check that folder against conversations, so nobody can
-- upload into, or read from, a thread they aren't part of.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images', 'chat-images', false,
  5242880, -- 5MB, matches MAX_CHAT_IMAGE_BYTES in lib/chat-images.ts
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat participants upload images" on storage.objects;
create policy "chat participants upload images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and exists (
      select 1 from conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

drop policy if exists "chat participants read images" on storage.objects;
create policy "chat participants read images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-images'
    and exists (
      select 1 from conversations c
      where c.id::text = (storage.foldername(name))[1]
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

-- The storage path of the photo (not a URL — URLs are signed at read time).
alter table messages add column if not exists image_url text;
