import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { markDeliveredIfTracked } from "@/lib/orders/tracking";

/**
 * Seller asks "has it arrived yet?". This used to let the seller simply
 * declare an order delivered, which started the buyer's 48-hour clock and
 * paid the seller automatically when it ran out — with no proof the parcel
 * ever arrived. Now only Australia Post tracking can move an order to
 * awaiting_confirmation (see lib/orders/tracking.ts). Without tracking
 * confirmation the order stays "shipped" and the buyer confirms it, or it
 * auto-releases BRAND.shippedAutoReleaseDays after posting unless they
 * report a problem. Pickup orders are never marked delivered by anyone
 * but the buyer.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(`order-deliver:${clientKey(req)}`, { limit: 20 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, seller_id, status, fulfillment_method")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.seller_id !== user.id)
    return NextResponse.json({ error: "Only the seller can check delivery." }, { status: 403 });
  if (order.fulfillment_method === "pickup")
    return NextResponse.json(
      { error: "Pickup orders are completed by the buyer confirming collection." },
      { status: 400 }
    );
  if (order.status !== "shipped")
    return NextResponse.json(
      { error: `Can't check delivery on an order in "${order.status}" status.` },
      { status: 400 }
    );

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const delivered = await markDeliveredIfTracked(admin, id);
  if (!delivered)
    return NextResponse.json(
      {
        error:
          "Australia Post hasn't confirmed delivery yet. The buyer can confirm it themselves, or payment releases automatically if they don't report a problem.",
      },
      { status: 409 }
    );

  return NextResponse.json({ ok: true });
}
