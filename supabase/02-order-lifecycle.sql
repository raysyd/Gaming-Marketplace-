-- Sidegrade — order lifecycle: pending -> paid -> awaiting_postage ->
-- shipped -> awaiting_confirmation -> released, with disputed/refunded off
-- to the side. Paste into Supabase -> SQL Editor -> Run. Safe to run more
-- than once.
--
-- `status` on both `orders` and `listings` stays plain `text` (no enum,
-- no check constraint) — matching how every other status column in this
-- schema already works — so the new values (`awaiting_postage`,
-- `awaiting_confirmation`, `disputed` on orders; `reserved`, `sold` on
-- listings) need no migration of their own, just the application code that
-- writes and reads them.

alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists dispute_reason text;

-- Shipping is charged once per seller per checkout, never per item (see
-- /api/checkout) — orders still has one row per listing, so the full fee
-- for a multi-item checkout is stored on that checkout's first order row
-- and 0 on the rest, rather than duplicated or split. `amount` keeps
-- meaning "this listing's price", unchanged.
alter table orders add column if not exists shipping_fee numeric not null default 0;

-- "An item cannot be purchased twice" — the hard guarantee. The app's own
-- first line of defense is reserving the listing (active -> reserved) with
-- an atomic conditional UPDATE before Stripe Checkout is even created (see
-- /api/checkout), but this is the guarantee that holds even if that ever
-- has a bug: at most one order that isn't refunded, ever, per listing.
create unique index if not exists orders_listing_unsettled_idx
  on orders (listing_id) where status <> 'refunded';

-- Stripe retries checkout.session.completed on anything but a fast 2xx —
-- the webhook handler is a straight insert, so a retried delivery must not
-- double-insert the same line item. (stripe_payment_intent is shared by
-- every order row from one multi-item checkout, so the pair, not the
-- payment intent alone, is what has to be unique.)
create unique index if not exists orders_pi_listing_idx
  on orders (stripe_payment_intent, listing_id) where stripe_payment_intent is not null;
