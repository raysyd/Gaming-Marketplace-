-- Sidegrade — local pickup. Deliberately reuses the existing order state
-- machine end to end rather than adding new statuses: a pickup order
-- still goes paid -> shipped -> awaiting_confirmation -> released, same
-- release/refund/dispute/auto-release-cron logic untouched. Only what
-- the seller has to provide to reach "shipped" (a tracking number, or
-- not) and what the buyer's confirm action is called change. Paste into
-- Supabase -> SQL Editor -> Run. Safe to run more than once.

alter table listings add column if not exists pickup_available boolean not null default false;
alter table orders add column if not exists fulfillment_method text not null default 'shipping';
alter table orders drop constraint if exists orders_fulfillment_method_check;
alter table orders add constraint orders_fulfillment_method_check
  check (fulfillment_method in ('shipping', 'pickup'));
