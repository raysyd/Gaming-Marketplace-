-- Sidegrade — real seller/buyer profiles: permanent username, avatar,
-- bio, suburb/state, and an identity-verification flag distinct from the
-- paid Premium Seller badge (see 08-premium-seller.sql).
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Every listing has always shown a generic "Seller" label for real
-- accounts because nothing ever populated a profile beyond
-- display_name/stripe_account_id — this is the actual missing data, not
-- a UI fix.

alter table profiles add column if not exists username text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists suburb text;
alter table profiles add column if not exists state text;
-- Identity-checked through Stripe, never something a purchase can grant —
-- see the comment on premium_subscriptions in 08-premium-seller.sql. No
-- automated verification flow exists yet; this column is the eventual
-- target of one (or, until then, a manual support-side check), and stays
-- false for every account until something explicit sets it.
alter table profiles add column if not exists verified boolean not null default false;

-- Format: lowercase letters, digits, underscores, 3-20 chars. Enforced
-- here (not just in the form) because the API route is not the only thing
-- that can reach this table with a signed-in session.
alter table profiles drop constraint if exists profiles_username_format;
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

create unique index if not exists profiles_username_idx
  on profiles (username) where username is not null;

-- Usernames are permanent — see the brief: allowing renames lets a
-- seller with bad reviews shed their history, since a username is how an
-- account is traced across the platform. The API route only ever sets it
-- once, but that's convention, not a control; this trigger is the actual
-- one; it fires on every UPDATE regardless of which client or role makes it.
create or replace function prevent_username_change()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Usernames are permanent and cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_username_immutable on profiles;
create trigger profiles_username_immutable
  before update on profiles
  for each row execute function prevent_username_change();

-- Avatars ----------------------------------------------------------------
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('avatars', 'avatars', true, array['image/jpeg', 'image/png', 'image/webp'], 4194304) -- 4MB
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "signed in users upload their avatar" on storage.objects;
create policy "signed in users upload their avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists "owners replace or delete their avatar" on storage.objects;
create policy "owners replace or delete their avatar" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid())
  with check (bucket_id = 'avatars' and owner = auth.uid());
