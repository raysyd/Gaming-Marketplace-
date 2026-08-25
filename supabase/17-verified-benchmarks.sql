-- Sidegrade — "Verified Benchmarks": optional GPU-Z/CPU-Z/3DMark/
-- Cinebench/CrystalDiskInfo screenshots on a listing, shown as a
-- "Performance Verified" badge. Paste into Supabase -> SQL Editor -> Run.
-- Safe to run more than once.
--
-- No new storage bucket or RLS needed — these are still just images tied
-- to a listing the seller already owns, so they reuse the exact same
-- "listing-photos" bucket and "sellers manage own listings" policy
-- everything else in listings does.

alter table listings add column if not exists benchmark_images jsonb default '[]'::jsonb;
