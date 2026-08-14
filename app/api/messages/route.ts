import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit(`messages:${clientKey(req)}`, { limit: 30 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { conversationId, body, listingId } = await req.json();
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

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    listing_id: listingId,
    sender_id: user.id,
    body,
    kind: "text",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("conversations")
    .update({ last_message: body, updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ ok: true, persisted: true });
}
