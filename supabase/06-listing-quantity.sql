-- Sidegrade — real per-listing quantity, and the RLS hole it surfaced.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- CONFIRMED PRE-EXISTING BUG, found while wiring this up: /api/checkout's
-- reservation step ran
--   update listings set status = 'reserved' where id = any(ids) and status = 'active'
-- through the signed-in *buyer's* own cookie-authed client. The only
-- UPDATE policy on `listings` is "sellers manage own listings"
-- (`using (seller_id = auth.uid())`) — there has never been a policy
-- letting a buyer touch a listing they don't own. RLS doesn't error on
-- that, it just silently matches zero rows, so every reservation attempt
-- against a real seller's real listing returned `reserved.length !== ids.length`
-- and the buyer was told "someone just bought this" on a completely fresh
-- listing. Checkout has not actually worked end-to-end for a real
-- cross-user purchase since the order-lifecycle rewrite — it was never
-- exercised outside the seller's own account (or Stripe never even being
-- configured, which short-circuits before this point).
--
-- Fix: reservation and its rollback move into SECURITY DEFINER functions
-- instead of a buyer-side UPDATE policy. That's deliberate, not just a
-- workaround — a policy letting any signed-in user update someone else's
-- listing row would be far too broad a grant (it can only be scoped by
-- USING/WITH CHECK, which can't restrict *which columns* change). These
-- functions are narrow on purpose: the only things they can ever do are
-- decrement stock by exactly 1 (never below 0, never on an inactive/
-- already-sold listing) or increment it back, nothing else about the row
-- is reachable through them.
--
-- This also replaces the single "reserved" whole-listing status flip
-- with a real stock count, since a quantity > 1 listing must stay
-- purchasable by other buyers while one unit is reserved. The old
-- guarantee — orders_listing_unsettled_idx, "at most one non-refunded
-- order per listing, ever" — assumed every listing had exactly one unit.
-- That's no longer true, so it's dropped; the guarantee now lives on
-- `stock` itself: the functions below decrement it with a single atomic
-- UPDATE (serialized by Postgres's own row lock, so two buyers racing
-- for the last unit can't both win), and this CHECK is the backstop that
-- holds even if the function logic ever has a bug.
drop index if exists orders_listing_unsettled_idx;

alter table listings drop constraint if exists listings_stock_nonneg;
alter table listings add constraint listings_stock_nonneg check (stock >= 0);

create or replace function reserve_listing_stock(ids uuid[])
returns table(id uuid, stock int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  return query
    update listings
    set stock = listings.stock - 1,
        status = case when listings.stock - 1 <= 0 then 'sold' else listings.status end
    where listings.id = any(ids)
      and listings.status = 'active'
      and listings.stock > 0
    returning listings.id, listings.stock;
end;
$$;

create or replace function release_listing_stock(ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update listings
  set stock = listings.stock + 1,
      status = case when listings.status = 'sold' then 'active' else listings.status end
  where listings.id = any(ids);
end;
$$;

revoke all on function reserve_listing_stock(uuid[]) from public;
grant execute on function reserve_listing_stock(uuid[]) to authenticated;
-- release runs from both the buyer-authed client (rolling back its own
-- partial reservation) and the service-role webhook client (expired
-- checkout, refund) — both need it.
revoke all on function release_listing_stock(uuid[]) from public;
grant execute on function release_listing_stock(uuid[]) to authenticated, service_role;
