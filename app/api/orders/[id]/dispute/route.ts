import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Buyer reports a problem instead of confirming — funds stay held (no
 * Stripe call here at all), order moves to disputed. Resolving a dispute
 * (refund, or releasing anyway) is a manual call today: the seller's
 * existing "Refund" action on /selling still works from "disputed", and
 * support can do the same. An automated resolution flow isn't something
 * this brief asked for.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-dispute:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { id } = await params;
  const { reason } = await req.json();
  if (!reason?.trim())
    return NextResponse.json({ error: "Describe the problem before submitting." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, status")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.buyer_id !== user.id)
    return NextResponse.json({ error: "Only the buyer can report a problem." }, { status: 403 });
  if (!["shipped", "awaiting_confirmation"].includes(order.status))
    return NextResponse.json(
      { error: `Can't report a problem on an order in "${order.status}" status.` },
      { status: 400 }
    );

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "disputed", dispute_reason: String(reason).slice(0, 2000) })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
