-- Sidegrade — "permission denied for table profiles" fix.
--
-- 08-premium-seller.sql and 11-profile-extras.sql each do
-- `revoke insert, update on profiles from authenticated` and then
-- re-grant an explicit column list — safe when run in order, but if
-- they ran out of order, or one of them landed in the same pasted batch
-- as a later statement that failed (which rolls back everything in that
-- batch, including an earlier successful revoke/grant), `authenticated`
-- can end up with the revoke applied but not the follow-up grant —
-- i.e. no insert/update on profiles at all. That's exactly what
-- "permission denied for table profiles" on saving your profile means.
--
-- This file is the single, final word on the grant state: it doesn't
-- assume anything about what ran before, and is safe to run any number
-- of times, in any order relative to 07/08/10/11 (as long as they've
-- all been run at some point, since this references columns they add).
-- Paste into Supabase -> SQL Editor -> Run.

revoke insert, update on profiles from authenticated;
grant insert (
  id, display_name, username, avatar_url, bio, suburb, state,
  stripe_account_id, contact_link, policy_note, banner_url
) on profiles to authenticated;
grant update (
  display_name, username, avatar_url, bio, suburb, state,
  stripe_account_id, contact_link, policy_note, banner_url
) on profiles to authenticated;

-- Diagnostic — run this separately afterwards to confirm the fix. Each
-- row is one column `authenticated` can insert/update; if display_name,
-- username, avatar_url, bio, suburb, state aren't all listed for both
-- privilege_type values, something above didn't take.
--
-- select privilege_type, column_name
-- from information_schema.column_privileges
-- where table_name = 'profiles' and grantee = 'authenticated'
-- order by privilege_type, column_name;
