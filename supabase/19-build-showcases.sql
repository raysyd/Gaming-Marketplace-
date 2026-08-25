-- Sidegrade — Build Showcases: a user can post a completed gaming setup
-- (photos, specs, FPS notes) as its own thing, separate from a listing —
-- for community/organic traffic, not a sale. Paste into Supabase -> SQL
-- Editor -> Run. Safe to run more than once.

create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  photos jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  fps_notes text,
  created_at timestamptz default now()
);
create index if not exists builds_user_idx on builds (user_id, created_at desc);
create index if not exists builds_created_idx on builds (created_at desc);

alter table builds enable row level security;

-- Public feed, same as reviews/listings — a build only exists to be seen.
drop policy if exists "builds readable" on builds;
create policy "builds readable" on builds for select using (true);

drop policy if exists "own builds writable" on builds;
create policy "own builds writable" on builds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
