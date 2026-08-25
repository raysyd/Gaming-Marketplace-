-- Sidegrade — price history: every price a listing has ever had, logged
-- automatically. Paste into Supabase -> SQL Editor -> Run. Safe to run
-- more than once. This is also what makes real "price dropped" alerts
-- possible later — supabase/16-saved-searches.sql's cron only ever
-- checked for new listings, explicitly noting this table didn't exist
-- yet as the reason why.

create table if not exists listing_price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  price numeric not null,
  recorded_at timestamptz not null default now()
);
create index if not exists listing_price_history_idx on listing_price_history (listing_id, recorded_at);

alter table listing_price_history enable row level security;
drop policy if exists "price history readable" on listing_price_history;
create policy "price history readable" on listing_price_history for select using (true);
-- No insert/update/delete policy for any client role — every row is
-- written by the trigger functions below (SECURITY DEFINER, so they run
-- regardless of who triggered the underlying listings write), never
-- directly by the app.

create or replace function log_initial_listing_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price is not null then
    insert into listing_price_history (listing_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

create or replace function log_listing_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.price is not null and new.price is distinct from old.price then
    insert into listing_price_history (listing_id, price) values (new.id, new.price);
  end if;
  return new;
end;
$$;

drop trigger if exists listing_price_insert_log on listings;
create trigger listing_price_insert_log
  after insert on listings
  for each row execute function log_initial_listing_price();

drop trigger if exists listing_price_update_log on listings;
create trigger listing_price_update_log
  after update of price on listings
  for each row execute function log_listing_price_change();
