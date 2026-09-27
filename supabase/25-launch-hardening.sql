-- Sidegrade — launch hardening: chargebacks, reports, account suspension.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- * orders.chargeback_status — set only by the Stripe webhook when a buyer's
--   bank opens a chargeback (charge.dispute.*). While it's anything but
--   'won', lib/orders/release.ts refuses to pay the seller.
-- * orders.refunded_at — when the money went back, for support and the admin
--   console.
-- * reports — "report this listing / this user". Browsers can only insert
--   their own; nobody can read them except the service role (/admin).
-- * profiles.suspended_at — set from /admin. A suspended account is also
--   banned in Supabase Auth and its active listings are taken down.

alter table orders add column if not exists chargeback_status text;
alter table orders add column if not exists refunded_at timestamptz;

create index if not exists orders_status_idx on orders (status, created_at desc);

alter table profiles add column if not exists suspended_at timestamptz;

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users on delete cascade,
  listing_id uuid references listings on delete cascade,
  reported_user_id uuid references auth.users on delete cascade,
  reason text not null check (reason in ('scam', 'off_platform_payment', 'counterfeit', 'misleading', 'prohibited', 'harassment', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (listing_id is not null or reported_user_id is not null)
);
create index if not exists reports_open_idx on reports (created_at desc) where status = 'open';

alter table reports enable row level security;

drop policy if exists "file own reports" on reports;
create policy "file own reports" on reports
  for insert with check (auth.uid() = reporter_id);

-- One open report per reporter per target is plenty.
create unique index if not exists reports_one_open_per_target
  on reports (reporter_id, coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid),
              coalesce(reported_user_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'open';
