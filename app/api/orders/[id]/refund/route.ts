import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { refundOrder } from "@/lib/orders/refund";
import { notifyOrder } from "@/lib/orders/notify";

/**
 * Seller-initiated refund of one order row. The money logic (partial
 * refund of just this row, reversing a transfer that already went out,
 * restocking) lives in lib/orders/refund.ts, shared with /admin and the
 * unshipped-order cron.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimit(`order-refund:${clientKey(req)}`, { limit: 10 });
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
    .select("id, seller_id")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.seller_id !== user.id)
    return NextResponse.json({ error: "Only the seller can refund this order." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const result = await refundOrder(id, admin);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await notifyOrder(admin, id, "refunded");
  return NextResponse.json({ ok: true });
}
