-- Sidegrade — a self-declared Private/Business seller label, and making
-- listings.state (already existed, never populated) actually usable as a
-- /shop filter. Paste into Supabase -> SQL Editor -> Run. Safe to run
-- more than once.
--
-- seller_type is plain self-disclosure, not a tax/legal determination —
-- see the caption next to the field in AccountSettingsForm.tsx. Real
-- GST/ABN/Australian Consumer Law handling for business sellers is a
-- deliberately separate, deferred piece of work that needs actual legal
-- review, not just an engineering toggle.

alter table profiles add column if not exists seller_type text default 'private';
alter table profiles drop constraint if exists profiles_seller_type_check;
alter table profiles add constraint profiles_seller_type_check
  check (seller_type in ('private', 'business'));

-- Re-issue the full column-level grant list (same pattern as
-- 11-profile-extras.sql) — without adding seller_type here too, it would
-- silently fail to save under RLS exactly like premium_status/verified
-- are deliberately kept out of this same list.
--
-- IMPORTANT: `id` must be in the UPDATE list too, even though it's never
-- actually meant to change — see supabase/13-fix-profile-id-update-grant.sql.
-- Every profile save is an upsert, which Postgres compiles to
-- `... ON CONFLICT (id) DO UPDATE SET id = excluded.id, ...` even though
-- the value is a no-op; leaving `id` out of this list here would silently
-- undo that fix and bring back "permission denied for table profiles" on
-- every single profile save.
revoke insert, update on profiles from authenticated;
grant insert (
  id, display_name, username, avatar_url, banner_url, bio, suburb, state,
  stripe_account_id, contact_link, policy_note, seller_type
) on profiles to authenticated;
grant update (
  id, display_name, username, avatar_url, banner_url, bio, suburb, state,
  stripe_account_id, contact_link, policy_note, seller_type
) on profiles to authenticated;
