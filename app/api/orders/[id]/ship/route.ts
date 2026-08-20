import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { isValidAusPostTrackingNumber, normalizeTrackingNumber } from "@/lib/shipping/auspost";

/** Seller enters an Australia Post tracking number — paid -> shipped. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-ship:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { id } = await params;
  const { trackingNumber } = await req.json();
  if (!trackingNumber || !isValidAusPostTrackingNumber(String(trackingNumber)))
    return NextResponse.json(
      { error: "That doesn't look like a valid Australia Post tracking number." },
      { status: 400 }
    );

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, seller_id, status")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.seller_id !== user.id)
    return NextResponse.json({ error: "Only the seller can add tracking." }, { status: 403 });
  if (order.status !== "paid")
    return NextResponse.json(
      { error: `Can't mark an order in "${order.status}" status as shipped.` },
      { status: 400 }
    );

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "shipped",
      tracking_number: normalizeTrackingNumber(String(trackingNumber)),
      shipped_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
