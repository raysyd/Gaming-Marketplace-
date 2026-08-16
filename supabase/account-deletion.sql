-- Sidegrade — self-service account deletion.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Lets a signed-in user permanently delete their own account (called from
-- /account/delete/confirm after they've proved inbox access via a fresh
-- email link — see app/account/delete). SECURITY DEFINER is what lets this
-- reach auth.users; the auth.uid() check is what stops it from ever being
-- used on anyone but the caller.
--
-- Blocked if the account has order history — that's a financial/escrow
-- record, not something to silently cascade-delete. profiles, listings,
-- conversations, messages, offers and wishlist rows all cascade-delete via
-- their existing "on delete cascade" foreign keys to auth.users.

create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in.';
  end if;

  if exists (select 1 from orders where buyer_id = uid or seller_id = uid) then
    raise exception 'This account has order history and can''t be deleted automatically — contact support.';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function delete_own_account() from anon;
grant execute on function delete_own_account() to authenticated;
