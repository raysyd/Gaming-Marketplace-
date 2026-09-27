-- Sidegrade — listing status guard. Paste into Supabase -> SQL Editor -> Run.
-- Safe to run more than once.
--
-- The publish gate (minimum photos, a working payout account, the free
-- plan's listing limit) lives in app/api/listings/route.ts, but a seller
-- could skip it by writing listings.status straight through the REST API:
-- insert a row as 'active', flip a draft to 'active', or bring back a
-- listing support removed. Signed-in (and anon) writes may now only create
-- drafts and take a live listing down; going live is done by the API with
-- the service role after its checks (goLive()). Security-definer functions
-- (stock reservation marking a listing sold, etc.) and the service role
-- run as other roles and aren't affected.

create or replace function listing_guard_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'draft';
  elsif new.status is distinct from old.status
        and not (old.status = 'active' and new.status = 'inactive') then
    raise exception 'Listing status can only be changed through Sidegrade.'
      using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists listings_guard_status on listings;
create trigger listings_guard_status before insert or update on listings
  for each row execute function listing_guard_status();
revoke execute on function listing_guard_status() from public, anon, authenticated;
