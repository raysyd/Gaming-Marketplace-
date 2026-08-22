-- Sidegrade — buy more than one unit of a listing in a single checkout.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- 06-listing-quantity.sql's reserve_listing_stock/release_listing_stock
-- only ever move stock by exactly 1 — that was correct for "one unit per
-- listing per checkout", which is all the cart supported at the time, but
-- it's not the same guarantee as "reject purchases exceeding stock" once
-- the cart lets a buyer ask for N units of one listing. These are new,
-- quantity-aware functions rather than edits to the existing ones, so
-- nothing already calling the old (ids uuid[]) signature — including its
-- own test suite — changes behaviour.

alter table orders add column if not exists quantity int not null default 1;

create or replace function reserve_listing_stock_qty(ids uuid[], qtys int[])
returns table(id uuid, stock int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if array_length(ids, 1) is distinct from array_length(qtys, 1) then
    raise exception 'ids and qtys must be the same length.';
  end if;

  -- Same atomic-conditional-UPDATE shape as reserve_listing_stock: one
  -- statement per call, serialized by Postgres's own row lock, so two
  -- buyers racing for the last N units of the same listing can't both
  -- succeed. `stock >= req.qty` (not just `> 0`) is what actually rejects
  -- a purchase that exceeds remaining stock.
  return query
    update listings
    set stock = listings.stock - req.qty,
        status = case when listings.stock - req.qty <= 0 then 'sold' else listings.status end
    from (select unnest(ids) as id, unnest(qtys) as qty) as req
    where listings.id = req.id
      and listings.status = 'active'
      and listings.stock >= req.qty
      and req.qty > 0
    returning listings.id, listings.stock;
end;
$$;

create or replace function release_listing_stock_qty(ids uuid[], qtys int[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if array_length(ids, 1) is distinct from array_length(qtys, 1) then
    raise exception 'ids and qtys must be the same length.';
  end if;

  update listings
  set stock = listings.stock + req.qty,
      status = case when listings.status = 'sold' then 'active' else listings.status end
  from (select unnest(ids) as id, unnest(qtys) as qty) as req
  where listings.id = req.id;
end;
$$;

revoke all on function reserve_listing_stock_qty(uuid[], int[]) from public;
grant execute on function reserve_listing_stock_qty(uuid[], int[]) to authenticated;
-- Same two callers as release_listing_stock: the buyer-authed client
-- rolling back its own partial reservation, and the service-role webhook
-- (expired checkout, refund).
revoke all on function release_listing_stock_qty(uuid[], int[]) from public;
grant execute on function release_listing_stock_qty(uuid[], int[]) to authenticated, service_role;
