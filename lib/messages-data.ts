import type { Conversation, Listing, Message } from "./types";
import { getAuthedUser } from "./supabase/server";
import { rowToListing } from "./data";

/**
 * Real conversations + messages for the signed-in user, as either buyer or
 * seller. app/messages/page.tsx used to pass DEMO_CONVERSATIONS /
 * DEMO_MESSAGES unconditionally — this is what replaces that so a real
 * message from a real conversation is actually visible on load, not just
 * to whichever browser tab sent it.
 */
export async function queryMessengerData(): Promise<{
  conversations: Conversation[];
  messages: Record<string, Message[]>;
}> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return { conversations: [], messages: {} };

  const { data: convRows, error: convError } = await supabase
    .from("conversations")
    .select("*, listings(title, image, seller_name)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });
  if (convError || !convRows?.length) return { conversations: [], messages: {} };

  // conversations.buyer_id references auth.users, not profiles, so it
  // can't be embedded via the same select() the way listings can — a
  // second lookup is the only way to get a name instead of a bare id for
  // whichever side of the thread the viewer isn't.
  const buyerIds = [...new Set(convRows.map((c) => c.buyer_id as string))];
  const { data: buyerProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", buyerIds);
  const buyerName = new Map((buyerProfiles ?? []).map((p) => [p.id, p.display_name]));

  const conversations: Conversation[] = convRows.map((c) => {
    const iAmBuyer = c.buyer_id === user.id;
    return {
      id: c.id,
      listingId: c.listing_id,
      listingTitle: c.listings?.title ?? "Listing",
      listingImage: c.listings?.image ?? "",
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
      otherPartyName: iAmBuyer
        ? (c.listings?.seller_name ?? "Seller")
        : (buyerName.get(c.buyer_id) ?? "Buyer"),
      lastMessage: c.last_message ?? "",
      updatedAt: c.updated_at,
      unread: 0,
    };
  });

  const convIds = convRows.map((c) => c.id);
  // Embeds the offer row a message announces, if any — the message itself
  // is immutable (05-messages-immutable.sql), so its live accept/decline/
  // counter status has to come from a join, not the message row.
  const { data: msgRows } = await supabase
    .from("messages")
    .select("*, offers(status, counter_amount)")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: true });

  const messages: Record<string, Message[]> = {};
  for (const m of msgRows ?? []) {
    const list = (messages[m.conversation_id] ??= []);
    list.push({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      body: m.body,
      kind: (m.kind as Message["kind"]) ?? "text",
      offerAmount: m.offer_amount ? Number(m.offer_amount) : undefined,
      offerId: m.offer_id ?? undefined,
      offerStatus: m.offers?.status as Message["offerStatus"],
      offerCounterAmount: m.offers?.counter_amount ? Number(m.offers.counter_amount) : undefined,
      createdAt: m.created_at,
    });
  }

  // Unread — anything sent by the other party with no read_at yet. Cheap
  // to compute here since the messages are already in hand.
  for (const conv of conversations) {
    conv.unread = (messages[conv.id] ?? []).filter(
      (m) => m.senderId !== user.id && !msgRows?.find((r) => r.id === m.id)?.read_at
    ).length;
  }

  return { conversations, messages };
}

/**
 * Just the listings the inbox can actually show: the ones behind the
 * viewer's conversations, the one a "Message seller"/offer deep link points
 * at, and the viewer's own active listings (a buyer can open a brand-new
 * thread on any of those at any moment, see Messenger's realtime handler).
 * Replaces loading the first 200 active listings on every visit — which
 * was both slow and wrong: a thread about any listing outside that first
 * page (or one that had since sold) couldn't be opened at all.
 */
export async function queryMessengerListings(
  conversations: Conversation[],
  deepListingId?: string
): Promise<Listing[]> {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) return [];

  const ids = [...new Set([...conversations.map((c) => c.listingId), deepListingId].filter(Boolean))];
  const uuid = /^[0-9a-f-]{36}$/i;
  const idFilter = ids.filter((id) => uuid.test(id as string)).join(",");
  const own = `and(seller_id.eq.${user.id},status.eq.active)`;

  const { data } = await supabase
    .from("listings")
    .select("*")
    .or(idFilter ? `id.in.(${idFilter}),${own}` : own)
    .limit(500);
  return (data ?? []).map((r) => rowToListing(r));
}
