-- Sidegrade — real seller reviews, replacing the fabricated
-- seller_rating/seller_sales defaults every listing shipped with.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references orders on delete cascade,
  reviewer_id uuid not null references auth.users on delete cascade,
  seller_id uuid not null references auth.users on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz default now()
);
create index if not exists reviews_seller_idx on reviews (seller_id, created_at desc);

alter table reviews enable row level security;

drop policy if exists "reviews readable" on reviews;
create policy "reviews readable" on reviews for select using (true);

-- One review per order, and only the buyer on a *released* order for
-- *that* seller may write it — enforced here, not just hidden in the UI,
-- so a crafted request can't fabricate a review for an order that never
-- completed or that belongs to someone else.
drop policy if exists "buyer reviews own released order" on reviews;
create policy "buyer reviews own released order" on reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from orders o
      where o.id = order_id
        and o.buyer_id = auth.uid()
        and o.seller_id = reviews.seller_id
        and o.status = 'released'
    )
  );

-- Batched review + real-sales stats for a page's worth of sellers in one
-- round trip, rather than one query per card — same reasoning as
-- listing_counts_by_sub in scaling.sql. "Sales" here means completed
-- (released) orders, not the old fabricated seller_sales column.
create or replace function seller_stats(seller_ids uuid[])
returns table (seller_id uuid, review_count bigint, avg_rating numeric, sales_count bigint)
language sql stable as $$
  select
    s.id as seller_id,
    coalesce(r.review_count, 0) as review_count,
    r.avg_rating,
    coalesce(o.sales_count, 0) as sales_count
  from unnest(seller_ids) as s(id)
  left join (
    select seller_id, count(*) as review_count, avg(rating)::numeric(3,2) as avg_rating
    from reviews group by seller_id
  ) r on r.seller_id = s.id
  left join (
    select seller_id, count(*) as sales_count
    from orders where status = 'released' group by seller_id
  ) o on o.seller_id = s.id;
$$;
