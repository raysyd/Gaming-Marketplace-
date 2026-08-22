-- Sidegrade — sellers can actually respond to offers now: accept, decline,
-- or counter (and a buyer can accept/decline a counter). Paste into
-- Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Before this, `offers` had insert (buyer) and read (both parties) policies
-- but no update policy at all — the "Accept"/"Counter" buttons in the
-- message thread had nothing to actually call. This also links a chat
-- message to the real offer row it represents, so the thread can show
-- and react to that offer's live status instead of a decorative one-off
-- bubble with no server-side record.

alter table offers add column if not exists seller_id uuid references auth.users on delete cascade;
update offers o set seller_id = l.seller_id
  from listings l where l.id = o.listing_id and o.seller_id is null;
-- Backfilled above, so every existing row now has one; enforce it for new
-- rows too. (No-op if this has already been run and the column is already
-- not-null.)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'offers' and column_name = 'seller_id' and is_nullable = 'yes'
  ) then
    alter table offers alter column seller_id set not null;
  end if;
end $$;

alter table offers add column if not exists counter_amount numeric;
alter table offers add column if not exists responded_at timestamptz;

-- Which chat message announced this offer — lets the thread join back to
-- the offer's live status instead of freezing whatever it looked like the
-- moment it was sent.
alter table messages add column if not exists offer_id uuid references offers on delete set null;

drop policy if exists "offer parties respond" on offers;
create policy "offer parties respond" on offers
  for update
  using (
    (seller_id = auth.uid() and status = 'pending')
    or (buyer_id = auth.uid() and status = 'countered')
  )
  with check (
    (seller_id = auth.uid() and status in ('accepted', 'declined', 'countered'))
    or (buyer_id = auth.uid() and status in ('accepted', 'declined'))
  );

-- Column grants, same pattern as 05-messages-immutable.sql: RLS gates which
-- rows a policy lets through, not which columns, so without this a party
-- responding to an offer could also rewrite its amount, buyer_id or
-- listing_id in the same request.
revoke update on offers from authenticated;
grant update (status, counter_amount, responded_at) on offers to authenticated;
