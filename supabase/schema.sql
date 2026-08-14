-- Sidegrade schema. Paste into Supabase → SQL Editor → Run.

create extension if not exists "pgcrypto";

-- Profiles -------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  location text,
  rating numeric default 5,
  sales_count int default 0,
  stripe_account_id text,
  created_at timestamptz default now()
);

-- Listings -------------------------------------------------------------
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users on delete cascade,
  seller_name text,
  seller_rating numeric default 5,
  seller_sales int default 0,
  title text not null,
  category text not null,
  condition text not null,
  brand text,
  price numeric not null check (price > 0),
  compare_at numeric,
  specs jsonb default '[]'::jsonb,
  fps_1080p int,
  image text,
  images jsonb default '[]'::jsonb,
  description text,
  location text,
  ships_free boolean default false,
  accepts_offers boolean default true,
  stock int default 1,
  status text default 'active',
  created_at timestamptz default now()
);
create index if not exists listings_category_idx on listings (category);
create index if not exists listings_status_idx on listings (status);

-- Conversations & messages --------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings on delete cascade,
  buyer_id uuid not null references auth.users on delete cascade,
  seller_id uuid not null references auth.users on delete cascade,
  last_message text,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (listing_id, buyer_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  listing_id uuid references listings on delete set null,
  sender_id uuid not null references auth.users on delete cascade,
  body text not null,
  kind text default 'text',
  offer_amount numeric,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- Offers ---------------------------------------------------------------
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  buyer_id uuid not null references auth.users on delete cascade,
  amount numeric not null check (amount > 0),
  status text default 'pending',
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Orders (escrow state machine) ---------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings,
  buyer_id uuid not null references auth.users,
  seller_id uuid not null references auth.users,
  amount numeric not null,
  platform_fee numeric not null,
  stripe_payment_intent text,
  tracking_number text,
  -- pending -> paid -> shipped -> delivered -> released | refunded
  status text default 'pending',
  created_at timestamptz default now()
);

-- Row level security ---------------------------------------------------
alter table profiles enable row level security;
alter table listings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table offers enable row level security;
alter table orders enable row level security;

drop policy if exists "profiles readable" on profiles;
create policy "profiles readable" on profiles for select using (true);
drop policy if exists "own profile writable" on profiles;
create policy "own profile writable" on profiles for update using (auth.uid() = id);
drop policy if exists "own profile insert" on profiles;
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "active listings readable" on listings;
create policy "active listings readable" on listings
  for select using (status = 'active' or seller_id = auth.uid());
drop policy if exists "sellers manage own listings" on listings;
create policy "sellers manage own listings" on listings
  for all using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "participants read conversations" on conversations;
create policy "participants read conversations" on conversations
  for select using (auth.uid() in (buyer_id, seller_id));
drop policy if exists "buyers start conversations" on conversations;
create policy "buyers start conversations" on conversations
  for insert with check (auth.uid() = buyer_id);
drop policy if exists "participants update conversations" on conversations;
create policy "participants update conversations" on conversations
  for update using (auth.uid() in (buyer_id, seller_id));

drop policy if exists "participants read messages" on messages;
create policy "participants read messages" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );
drop policy if exists "participants send messages" on messages;
create policy "participants send messages" on messages
  for insert with check (
    auth.uid() = sender_id and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );

drop policy if exists "offer parties read" on offers;
create policy "offer parties read" on offers
  for select using (
    buyer_id = auth.uid()
    or exists (select 1 from listings l where l.id = offers.listing_id and l.seller_id = auth.uid())
  );
drop policy if exists "buyers make offers" on offers;
create policy "buyers make offers" on offers
  for insert with check (auth.uid() = buyer_id);

drop policy if exists "order parties read" on orders;
create policy "order parties read" on orders
  for select using (auth.uid() in (buyer_id, seller_id));

-- Realtime for live messaging -----------------------------------------
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;

-- Listing photos -------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "listing photos are public" on storage.objects;
create policy "listing photos are public" on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists "signed in users upload photos" on storage.objects;
create policy "signed in users upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos');

drop policy if exists "owners delete their photos" on storage.objects;
create policy "owners delete their photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid());
