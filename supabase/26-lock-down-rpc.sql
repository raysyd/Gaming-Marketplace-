-- Sidegrade — lock down database functions, restore account deletion,
-- and the Supabase advisor fixes. Paste into Supabase -> SQL Editor -> Run.
-- Safe to run more than once.
--
-- 1. Stock and sign-in lockout functions become service-role only.
--    Postgres grants EXECUTE to PUBLIC by default, so every one of these
--    SECURITY DEFINER functions was callable by anyone through
--    /rest/v1/rpc/...:
--      * reserve/release_listing_stock_qty: anyone could zero out or
--        inflate any listing's stock. Checkout now calls them with the
--        service role (app/api/checkout/route.ts).
--      * record_failed_signin / clear_signin_attempts /
--        signin_attempts_blocked: anyone could lock a real user out, or
--        clear an account's lockout between password guesses. Sign-in now
--        runs on the server (app/api/auth/signin/route.ts).
-- 2. Trigger and event-trigger functions aren't API endpoints at all.
--    (Postgres only checks EXECUTE when the trigger is created, so
--    revoking it doesn't stop them firing.)
-- 3. delete_own_account() from setup.sql was never applied to the live
--    database, so "Delete my account" always failed. Recreated here.
-- 4. Advisor fixes: pinned search_path, auth.uid() evaluated once per
--    query in RLS instead of once per row, and indexes on foreign keys.

-- 1 ---------------------------------------------------------------------
revoke execute on function reserve_listing_stock_qty(uuid[], integer[]) from public, anon, authenticated;
revoke execute on function release_listing_stock_qty(uuid[], integer[]) from public, anon, authenticated;
revoke execute on function record_failed_signin(text) from public, anon, authenticated;
revoke execute on function clear_signin_attempts(text) from public, anon, authenticated;
revoke execute on function signin_attempts_blocked(text) from public, anon, authenticated;
grant execute on function reserve_listing_stock_qty(uuid[], integer[]) to service_role;
grant execute on function release_listing_stock_qty(uuid[], integer[]) to service_role;
grant execute on function record_failed_signin(text) to service_role;
grant execute on function clear_signin_attempts(text) to service_role;
grant execute on function signin_attempts_blocked(text) to service_role;

-- 2 ---------------------------------------------------------------------
revoke execute on function log_initial_listing_price() from public, anon, authenticated;
revoke execute on function log_listing_price_change() from public, anon, authenticated;
revoke execute on function notify_new_message() from public, anon, authenticated;
revoke execute on function notify_saved_listing_change() from public, anon, authenticated;
revoke execute on function rls_auto_enable() from public, anon, authenticated;

-- 3 ---------------------------------------------------------------------
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
revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;

-- 4 ---------------------------------------------------------------------
alter function listing_counts_by_sub() set search_path = public;
alter function sync_watchers() set search_path = public;
alter function prevent_username_change() set search_path = public;

-- Rewrite every public RLS policy that calls auth.uid() bare so it's
-- wrapped in a sub-select, which Postgres evaluates once per statement.
do $$
declare
  p record;
  q text;
  c text;
begin
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)')
  loop
    q := regexp_replace(p.qual, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(p.with_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g');
    execute format(
      'alter policy %I on public.%I%s%s',
      p.policyname,
      p.tablename,
      case when q is not null then format(' using (%s)', q) else '' end,
      case when c is not null then format(' with check (%s)', c) else '' end
    );
  end loop;
end $$;

create index if not exists messages_listing_id_idx on messages (listing_id);
create index if not exists messages_offer_id_idx on messages (offer_id);
create index if not exists messages_sender_id_idx on messages (sender_id);
create index if not exists notifications_actor_id_idx on notifications (actor_id);
create index if not exists notifications_conversation_id_idx on notifications (conversation_id);
create index if not exists notifications_listing_id_idx on notifications (listing_id);
create index if not exists offers_buyer_id_idx on offers (buyer_id);
create index if not exists offers_listing_id_idx on offers (listing_id);
create index if not exists offers_seller_id_idx on offers (seller_id);
create index if not exists reports_listing_id_idx on reports (listing_id);
create index if not exists reports_reported_user_id_idx on reports (reported_user_id);
create index if not exists reviews_reviewer_id_idx on reviews (reviewer_id);

-- 5 ---------------------------------------------------------------------
-- Listings: trust signals the seller must not be able to write, and three
-- columns nothing in the app ever kept up to date.
--
-- "sellers manage own listings" lets a seller update every column of
-- their own row straight through the REST API, so seller_verified,
-- seller_rating, seller_sales and watchers could be set to anything
-- (a fake "Verified trader" badge, 999 watchers). Writes are now limited
-- to the columns the app itself sends (app/api/listings/route.ts).
revoke insert, update on listings from authenticated, anon;
grant insert (id, seller_id, seller_name, title, slug, description, price, stock, status, condition,
              category, category_slug, subcategory_slug, brand, specs, image, images, benchmark_images,
              location, state, ships_free, pickup_available, accepts_offers, weight_grams, fps_1080p)
  on listings to authenticated;
grant update (seller_name, title, slug, description, price, stock, status, condition,
              category, category_slug, subcategory_slug, brand, specs, image, images, benchmark_images,
              location, state, ships_free, pickup_available, accepts_offers, weight_grams, fps_1080p)
  on listings to authenticated;

-- watchers: the wishlist trigger ran as the person saving the listing,
-- and RLS only lets a seller update their own listing, so saving someone
-- else's listing never counted. Run it as the owner, and recount.
alter function sync_watchers() security definer;
revoke execute on function sync_watchers() from public, anon, authenticated;
update listings l set watchers = coalesce(w.n, 0)
from (select l2.id, count(w2.listing_id) n from listings l2 left join wishlist w2 on w2.listing_id = l2.id group by l2.id) w
where w.id = l.id and l.watchers is distinct from coalesce(w.n, 0);

-- seller_verified: only ever set on profiles (by the Stripe Identity
-- webhook), never copied to listings, so the badge on cards and the
-- "Verified sellers only" filter never worked for real sellers.
create or replace function listing_set_seller_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.seller_verified := coalesce((select verified from profiles where id = new.seller_id), false);
  return new;
end $$;
drop trigger if exists listings_seller_verified on listings;
create trigger listings_seller_verified before insert on listings
  for each row execute function listing_set_seller_verified();

create or replace function profile_sync_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update listings set seller_verified = new.verified where seller_id = new.id;
  return new;
end $$;
drop trigger if exists profiles_sync_verified on profiles;
create trigger profiles_sync_verified after update of verified on profiles
  for each row when (old.verified is distinct from new.verified)
  execute function profile_sync_verified();

revoke execute on function listing_set_seller_verified() from public, anon, authenticated;
revoke execute on function profile_sync_verified() from public, anon, authenticated;
update listings l set seller_verified = coalesce(p.verified, false)
from profiles p where p.id = l.seller_id and l.seller_verified is distinct from coalesce(p.verified, false);

-- compare_at ("was" price): nothing ever set it, so "Price drops" and
-- every "% off" badge were empty for real listings. When a seller lowers
-- a price, remember the higher one; raising it back to or above the old
-- price clears the drop.
create or replace function listing_track_price_drop() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.price is not null and old.price is not null then
    if new.price < old.price then
      new.compare_at := greatest(coalesce(old.compare_at, 0), old.price);
    elsif new.price >= coalesce(old.compare_at, 0) then
      new.compare_at := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists listings_track_price_drop on listings;
create trigger listings_track_price_drop before update of price on listings
  for each row execute function listing_track_price_drop();
revoke execute on function listing_track_price_drop() from public, anon, authenticated;
