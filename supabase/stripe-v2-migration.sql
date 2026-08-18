-- Sidegrade — Stripe Connect Accounts v2 migration.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Needed because checkout moved from a destination charge (money
-- auto-transfers to the seller's connected account at payment time) to
-- separate charges and transfers (the platform charges and holds the
-- money itself; /api/orders/[id]/release creates an explicit transfer
-- later). That transfer needs to be reversible if the seller refunds an
-- already-released order, which means its id has to be on the order row.

alter table orders add column if not exists stripe_transfer_id text;
