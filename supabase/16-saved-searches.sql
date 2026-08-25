-- Sidegrade — saved searches + new-listing alerts. Paste into Supabase ->
-- SQL Editor -> Run. Safe to run more than once.

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text not null,
  -- Exactly the shape lib/data.ts's ListingQuery / /shop's searchParams
  -- already use (q, category, sub, conditions, minPrice, maxPrice,
  -- freeShipping, verifiedOnly, dealsOnly) — so the alert cron can hand
  -- this straight to queryListings() rather than re-implementing filter
  -- matching a second time.
  query jsonb not null default '{}'::jsonb,
  -- Never re-notified before this; also the low-water mark for "what's
  -- new since last time" — starts at creation, not epoch, so saving a
  -- search doesn't immediately email every existing match.
  last_notified_at timestamptz not null default now(),
  created_at timestamptz default now()
);
create index if not exists saved_searches_user_idx on saved_searches (user_id, created_at desc);

alter table saved_searches enable row level security;
drop policy if exists "own saved searches" on saved_searches;
create policy "own saved searches" on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
