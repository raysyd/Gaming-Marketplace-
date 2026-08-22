-- Sidegrade — Premium Seller: a standard Stripe subscription (separate
-- from Connect, which is payouts) granting a higher listing limit, more
-- photos per listing, and a badge. Paste into Supabase -> SQL Editor ->
-- Run. Safe to run more than once.
--
-- Pricing and benefits live in a single configurable row, not in code —
-- change monthly_price_cents/free_listing_limit/etc. here (or eventually
-- from an admin UI reading/writing this same row) without a deploy. The
-- app reads this row at request time; nothing hardcodes these numbers.
create table if not exists premium_plan (
  id boolean primary key default true check (id), -- singleton: exactly one row, always id = true
  stripe_price_id text,
  monthly_price_cents int not null default 1500,
  currency text not null default 'aud',
  free_listing_limit int not null default 10,
  premium_listing_limit int not null default 100,
  free_max_photos int not null default 10,
  premium_max_photos int not null default 20,
  badge_label text not null default 'Premium Seller'
);
insert into premium_plan (id) values (true) on conflict (id) do nothing;

alter table premium_plan enable row level security;
drop policy if exists "premium plan readable" on premium_plan;
create policy "premium plan readable" on premium_plan for select using (true);
-- No insert/update/delete policy at all — this table is only ever
-- changed by a service-role connection (Supabase Studio's SQL Editor,
-- or a future admin tool using the service key), never by the app on a
-- user's behalf.

alter table profiles add column if not exists stripe_customer_id text;
alter table profiles add column if not exists premium_subscription_id text;
-- null = never subscribed. 'active' is the only value that actually
-- grants anything — Stripe's own subscription statuses (past_due,
-- unpaid, canceled, incomplete_expired, …) all fall through to "not
-- premium" rather than needing to be enumerated and trusted individually.
alter table profiles add column if not exists premium_status text;

-- IMPORTANT — this is what actually stops a seller granting themselves
-- Premium (or Verified) for free: the existing "own profile writable" RLS
-- policy is a *row*-level check (auth.uid() = id) with no column
-- restriction, so without this, any signed-in user could already run
-- `update profiles set premium_status = 'active', verified = true` from
-- their own browser session and it would pass RLS. Column-level GRANTs
-- are the only way Postgres restricts *which* columns a role can touch;
-- premium_status, verified, stripe_customer_id and
-- premium_subscription_id are deliberately left out of both lists below,
-- which makes them writable only by service_role (the webhook, on real
-- Stripe events) or a direct service-role connection.
revoke insert, update on profiles from authenticated;
grant insert (id, display_name, username, avatar_url, bio, suburb, state, stripe_account_id) on profiles to authenticated;
grant update (display_name, username, avatar_url, bio, suburb, state, stripe_account_id) on profiles to authenticated;
