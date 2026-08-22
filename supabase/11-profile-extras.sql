-- Sidegrade — three more editable profile fields: a contact/social link,
-- a shipping/returns policy note, and a banner image for the public
-- seller profile. Paste into Supabase -> SQL Editor -> Run. Safe to run
-- more than once.

alter table profiles add column if not exists contact_link text;
alter table profiles add column if not exists policy_note text;
alter table profiles add column if not exists banner_url text;

-- Re-issue the full column-level grant list (08-premium-seller.sql's
-- revoke already narrowed `authenticated` to an explicit column set) —
-- without adding these three here too, they'd silently fail to save
-- under RLS exactly like premium_status/verified are deliberately kept
-- out of this same list.
revoke insert, update on profiles from authenticated;
grant insert (id, display_name, username, avatar_url, bio, suburb, state, stripe_account_id, contact_link, policy_note, banner_url) on profiles to authenticated;
grant update (display_name, username, avatar_url, bio, suburb, state, stripe_account_id, contact_link, policy_note, banner_url) on profiles to authenticated;

-- Banners ----------------------------------------------------------------
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('banners', 'banners', true, array['image/jpeg', 'image/png', 'image/webp'], 6291456) -- 6MB, wider than an avatar
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "banners are public" on storage.objects;
create policy "banners are public" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "signed in users upload their banner" on storage.objects;
create policy "signed in users upload their banner" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'banners');

drop policy if exists "owners replace or delete their banner" on storage.objects;
create policy "owners replace or delete their banner" on storage.objects
  for all to authenticated
  using (bucket_id = 'banners' and owner = auth.uid())
  with check (bucket_id = 'banners' and owner = auth.uid());
