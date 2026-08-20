import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { nameFromEmail } from "@/lib/profile-name";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const limited = rateLimit(`messages:${clientKey(req)}`, { limit: 30 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { conversationId, listingId, body } = await req.json();
  if (!body?.trim())
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) {
    // Demo mode: the thread updates locally until Supabase is connected.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in to send messages." }, { status: 401 });

  // Same backfill as POST /api/listings — a message thread reads the
  // other side's name from profiles.display_name (see
  // lib/messages-data.ts), which nothing ever wrote before now.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!existingProfile?.display_name) {
    const derived = nameFromEmail(user.email);
    if (derived) await supabase.from("profiles").upsert({ id: user.id, display_name: derived });
  }

  // "Message seller" on a listing with no thread yet only ever has a
  // client-fabricated id (see components/Messenger.tsx) — a real one is a
  // uuid. Get-or-create it here rather than assuming the row already
  // exists, which is the bug this replaces: nothing previously ever
  // called conversations' own insert policy at all.
  let realConversationId: string | undefined =
    typeof conversationId === "string" && UUID_RE.test(conversationId) ? conversationId : undefined;

  if (!realConversationId) {
    if (!listingId)
      return NextResponse.json({ error: "Missing listing for a new conversation." }, { status: 400 });

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError || !listing)
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });

    // Only a buyer can start a thread (RLS's "buyers start conversations"
    // requires auth.uid() = buyer_id) — a seller messaging their own
    // listing isn't a real conversation to have.
    if (listing.seller_id === user.id)
      return NextResponse.json({ error: "You can't message yourself about your own listing." }, { status: 400 });

    // Upsert on the table's own (listing_id, buyer_id) unique constraint:
    // creates the thread the first time, and safely returns the existing
    // one on every message after that instead of erroring.
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .upsert(
        { listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id },
        { onConflict: "listing_id,buyer_id" }
      )
      .select("id")
      .single();
    if (convError || !conv)
      return NextResponse.json(
        { error: convError?.message ?? "Couldn't start the conversation." },
        { status: 500 }
      );
    realConversationId = conv.id;
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: realConversationId,
    listing_id: listingId ?? null,
    sender_id: user.id,
    body,
    kind: "text",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("conversations")
    .update({ last_message: body, updated_at: new Date().toISOString() })
    .eq("id", realConversationId);

  return NextResponse.json({ ok: true, persisted: true, conversationId: realConversationId });
}

/** Marks the other participant's messages in a thread read — clears the unread badge for real. */
export async function PATCH(req: Request) {
  const { conversationId } = await req.json();
  if (!conversationId || !UUID_RE.test(conversationId))
    return NextResponse.json({ ok: true, persisted: false });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true, persisted: false });

  // Only the other side's messages — a participant marking their own
  // messages "read" isn't a meaningful action.
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
