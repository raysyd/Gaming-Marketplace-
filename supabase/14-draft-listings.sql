-- Sidegrade — draft listings: a seller can save an in-progress listing
-- (like an email draft) and come back to finish it later, instead of
-- losing everything typed so far if they never reach "Publish". Paste
-- into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- No RLS or table-grant changes needed: "sellers manage own listings"
-- (schema.sql) already gives a seller full insert/update/delete on any
-- row where seller_id = auth.uid(), regardless of status, and "active
-- listings readable" already restricts everyone else to status = 'active'
-- — a draft is invisible to anyone but its owner for free. The only real
-- blocker was the schema itself: price is NOT NULL with a check(price > 0),
-- but a fresh draft often has no price yet.

alter table listings alter column price drop not null;
alter table listings drop constraint if exists listings_price_check;
alter table listings add constraint listings_price_check check (price is null or price > 0);
