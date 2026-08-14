-- Run AFTER schema.sql. Everything here is about staying fast as the
-- catalogue and the user count grow.

-- 1. Taxonomy + marketplace columns -----------------------------------
alter table listings add column if not exists slug text;
alter table listings add column if not exists category_slug text;
alter table listings add column if not exists subcategory_slug text;
alter table listings add column if not exists seller_verified boolean default false;
alter table listings add column if not exists watchers int default 0;
alter table listings add column if not exists state text;

-- 2. Full-text search --------------------------------------------------
-- A stored generated column means Postgres does the work once on write,
-- not on every query. Title is weighted above description so "4090"
-- in a title beats "was replacing a 4090" in a paragraph.
alter table listings add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index if not exists listings_search_idx on listings using gin (search_vector);

-- 3. Indexes for every filter combination the shop page issues ---------
create index if not exists listings_active_created_idx
  on listings (created_at desc) where status = 'active';
create index if not exists listings_active_price_idx
  on listings (price) where status = 'active';
create index if not exists listings_active_watchers_idx
  on listings (watchers desc) where status = 'active';
create index if not exists listings_sub_idx
  on listings (subcategory_slug, created_at desc) where status = 'active';
create index if not exists listings_cat_idx
  on listings (category_slug, created_at desc) where status = 'active';
create index if not exists listings_seller_idx on listings (seller_id, status);
create index if not exists listings_deals_idx
  on listings (compare_at) where status = 'active' and compare_at is not null;

-- Messaging: the two hot paths are "my conversations" and "this thread".
create index if not exists conversations_buyer_idx on conversations (buyer_id, updated_at desc);
create index if not exists conversations_seller_idx on conversations (seller_id, updated_at desc);
create index if not exists messages_thread_idx on messages (conversation_id, created_at desc);
create index if not exists messages_unread_idx on messages (conversation_id) where read_at is null;

create index if not exists orders_buyer_idx on orders (buyer_id, created_at desc);
create index if not exists orders_seller_idx on orders (seller_id, created_at desc);

-- 4. Facet counts without pulling rows ---------------------------------
create or replace function listing_counts_by_sub()
returns table (subcategory_slug text, n bigint)
language sql stable as $$
  select subcategory_slug, count(*)
  from listings
  where status = 'active'
  group by subcategory_slug;
$$;

-- 5. Wishlist ----------------------------------------------------------
create table if not exists wishlist (
  user_id uuid not null references auth.users on delete cascade,
  listing_id uuid not null references listings on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);
alter table wishlist enable row level security;
drop policy if exists "own wishlist" on wishlist;
create policy "own wishlist" on wishlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists wishlist_listing_idx on wishlist (listing_id);

-- Keep listings.watchers in sync so "most watched" is a plain indexed sort
-- rather than a join and count on every page load.
create or replace function sync_watchers() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update listings set watchers = watchers + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update listings set watchers = greatest(0, watchers - 1) where id = old.listing_id;
  end if;
  return null;
end;
$$;

drop trigger if exists wishlist_watchers on wishlist;
create trigger wishlist_watchers
  after insert or delete on wishlist
  for each row execute function sync_watchers();

-- 6. Slug backfill -----------------------------------------------------
update listings
set slug = regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')
where slug is null;
