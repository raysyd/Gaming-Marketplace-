-- Sidegrade — optional seller-entered weight, for the shipping estimate
-- in lib/shipping/estimate.ts. Paste into Supabase -> SQL Editor -> Run.
-- Safe to run more than once. Nullable — a seller who skips it just gets
-- a per-subcategory default estimate instead of one based on their exact
-- item.

alter table listings add column if not exists weight_grams int;
