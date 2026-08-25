-- Sidegrade — seller reputation extras, recently-sold, and price
-- intelligence. Paste into Supabase -> SQL Editor -> Run. Safe to run
-- more than once.
--
-- Also fixes a real bug in the existing seller_stats() (04-reviews.sql):
-- it was never marked `security definer`, so it ran as the *caller's*
-- role. Called from lib/seller-data.ts's getSellerStats() via the public
-- (anon-key, no session) client, that means every anonymous visitor to a
-- seller profile page — i.e. almost everyone — hit "order parties read"
-- (auth.uid() in (buyer_id, seller_id)) with auth.uid() = null, which
-- matches zero rows. sales_count has been silently showing 0 for every
-- signed-out viewer this whole time. `security definer` is safe here
-- specifically because this function only ever returns aggregates
-- (counts/averages), never a raw order row — same principle every
-- function below follows.

create or replace function seller_stats(seller_ids uuid[])
returns table (seller_id uuid, review_count bigint, avg_rating numeric, sales_count bigint)
language sql stable
security definer
set search_path = public
as $$
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

-- Median time-to-first-response per seller, from the last 90 days of
-- conversations. Only counts a conversation where the seller actually
-- replied within 7 days — one thread nobody ever answered shouldn't wreck
-- (or, going unanswered, silently improve) the average. Returns null when
-- there isn't enough data yet; the app never fabricates a number for that.
create or replace function seller_response_stats(seller_ids uuid[])
returns table (seller_id uuid, median_response_minutes numeric)
language sql stable
security definer
set search_path = public
as $$
  with first_msgs as (
    select
      c.id as conversation_id,
      c.seller_id,
      min(m.created_at) filter (where m.sender_id = c.buyer_id) as first_buyer_msg,
      min(m.created_at) filter (where m.sender_id = c.seller_id) as first_seller_msg
    from conversations c
    join messages m on m.conversation_id = c.id
    where c.seller_id = any(seller_ids)
      and c.created_at > now() - interval '90 days'
    group by c.id, c.seller_id
  ),
  response_times as (
    select
      seller_id,
      extract(epoch from (first_seller_msg - first_buyer_msg)) / 60 as minutes
    from first_msgs
    where first_seller_msg is not null
      and first_buyer_msg is not null
      and first_seller_msg > first_buyer_msg
      and first_seller_msg - first_buyer_msg < interval '7 days'
  )
  select
    s.id as seller_id,
    percentile_cont(0.5) within group (order by rt.minutes) as median_response_minutes
  from unnest(seller_ids) as s(id)
  left join response_times rt on rt.seller_id = s.id
  group by s.id;
$$;

-- For a batch of (this seller's) reviewers, how many *released* orders
-- each has with this specific seller — drives the "Repeat buyer" tag.
-- Reviews (and the reviewer's name on them) are already fully public, so
-- returning which reviewer_id repeats isn't disclosing anything beyond
-- what the review itself already shows.
create or replace function repeat_buyer_counts(p_seller_id uuid, buyer_ids uuid[])
returns table (buyer_id uuid, order_count bigint)
language sql stable
security definer
set search_path = public
as $$
  select o.buyer_id, count(*) as order_count
  from orders o
  where o.seller_id = p_seller_id
    and o.buyer_id = any(buyer_ids)
    and o.status = 'released'
  group by o.buyer_id;
$$;

-- Market-value range per subcategory, from real released sales in the
-- last 90 days. The app only ever shows this when sale_count is at least
-- ~5 — a range built on one or two sales is noise, not intelligence.
create or replace function subcategory_price_stats(subcategory_slugs text[])
returns table (subcategory_slug text, sale_count bigint, low numeric, high numeric)
language sql stable
security definer
set search_path = public
as $$
  select
    l.subcategory_slug,
    count(*) as sale_count,
    percentile_cont(0.25) within group (order by o.amount) as low,
    percentile_cont(0.75) within group (order by o.amount) as high
  from orders o
  join listings l on l.id = o.listing_id
  where o.status = 'released'
    and o.created_at > now() - interval '90 days'
    and l.subcategory_slug = any(subcategory_slugs)
  group by l.subcategory_slug;
$$;

-- Recently sold listings — title, category and sale price only, never
-- buyer identity. `sub` narrows to one subcategory (a product page's
-- "recently sold nearby" rail); `p_seller_id` narrows to one seller (a
-- seller profile's own "recently sold" section) — seller_id itself isn't
-- exposed by this, since the caller already knows whose profile they're
-- looking at. Both null shows the newest sales platform-wide.
create or replace function recently_sold_listings(
  sub text default null,
  p_seller_id uuid default null,
  limit_count int default 8
)
returns table (
  listing_id uuid,
  title text,
  slug text,
  category text,
  price numeric,
  sold_at timestamptz
)
language sql stable
security definer
set search_path = public
as $$
  select l.id as listing_id, l.title, l.slug, l.category, o.amount as price, o.created_at as sold_at
  from orders o
  join listings l on l.id = o.listing_id
  where o.status = 'released'
    and (sub is null or l.subcategory_slug = sub)
    and (p_seller_id is null or o.seller_id = p_seller_id)
  order by o.created_at desc
  limit least(limit_count, 50);
$$;
