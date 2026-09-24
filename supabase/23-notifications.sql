-- Sidegrade — in-app notifications (the bell in the header).
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Rows are only ever written by the triggers below (SECURITY DEFINER), never
-- by the browser, so a user can't forge a notification for someone else.
-- The browser can read its own rows and mark them read, nothing more.
--
-- What creates a notification:
--   * a new message or offer in one of your conversations (repeat messages in
--     the same unread thread update one notification instead of stacking up,
--     the way Facebook groups them)
--   * a listing you've saved (wishlist) selling
--   * a listing you've saved dropping in price

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('message', 'offer', 'liked_sold', 'price_drop')),
  actor_id uuid references auth.users on delete set null,
  actor_name text,
  actor_avatar text,
  listing_id uuid references listings on delete cascade,
  listing_title text,
  listing_image text,
  conversation_id uuid references conversations on delete cascade,
  body text,
  -- how many events this row stands for (grouped unread messages)
  count int not null default 1,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications
  for select using (auth.uid() = user_id);

-- Marking read is the only change a user can make. The column grant below
-- stops them rewriting anything else on the row.
drop policy if exists "mark own notifications read" on notifications;
create policy "mark own notifications read" on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke insert, update, delete on notifications from anon, authenticated;
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

-- Messages and offers ---------------------------------------------------
create or replace function notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conv record;
  recipient uuid;
  who text;
  pic text;
  lst_title text;
  lst_image text;
  k text;
  existing uuid;
begin
  select * into conv from conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = conv.buyer_id then conv.seller_id else conv.buyer_id end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  select coalesce(nullif(p.username, ''), nullif(p.display_name, ''), 'Someone'), p.avatar_url
    into who, pic
    from profiles p where p.id = new.sender_id;
  select title, image into lst_title, lst_image from listings where id = coalesce(new.listing_id, conv.listing_id);
  k := case when new.kind = 'offer' then 'offer' else 'message' end;

  if k = 'message' then
    -- Group: bump the existing unread notification for this conversation.
    select id into existing from notifications
      where user_id = recipient and conversation_id = conv.id
        and kind = 'message' and read_at is null
      limit 1;
    if existing is not null then
      update notifications
        set count = count + 1, body = left(new.body, 140), created_at = now()
        where id = existing;
      return new;
    end if;
  end if;

  insert into notifications
    (user_id, kind, actor_id, actor_name, actor_avatar, listing_id, listing_title,
     listing_image, conversation_id, body)
  values
    (recipient, k, new.sender_id, coalesce(who, 'Someone'), pic,
     coalesce(new.listing_id, conv.listing_id), lst_title, lst_image, conv.id,
     case when k = 'offer' then new.offer_amount::text else left(new.body, 140) end);
  return new;
end;
$$;

drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages
  for each row execute function notify_new_message();

-- Saved listings: sold / price drop ---------------------------------------
create or replace function notify_saved_listing_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sold' and coalesce(old.status, '') <> 'sold' then
    insert into notifications (user_id, kind, listing_id, listing_title, listing_image, body)
    select w.user_id, 'liked_sold', new.id, new.title, new.image, new.price::text
      from wishlist w
      where w.listing_id = new.id and w.user_id <> new.seller_id;
  elsif new.status = 'active' and new.price < old.price then
    insert into notifications (user_id, kind, listing_id, listing_title, listing_image, body)
    select w.user_id, 'price_drop', new.id, new.title, new.image,
           old.price::text || '>' || new.price::text
      from wishlist w
      where w.listing_id = new.id and w.user_id <> new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_notify_savers on listings;
create trigger listings_notify_savers after update of status, price on listings
  for each row execute function notify_saved_listing_change();

-- Live updates for the bell ------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
