import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";

/**
 * Seller marks an order delivered — the manual fallback for the automatic
 * "AusPost reports delivered" trigger described in the brief, since there's
 * no AusPost merchant API account configured yet (see lib/shipping/auspost.ts).
 * shipped -> awaiting_confirmation, which starts the buyer's confirmation
 * window. The buyer doesn't have to wait for this — they can confirm
 * delivery (and release payment) straight from "shipped" themselves,
 * since nobody knows better than they do whether it arrived; this exists
 * for the case where the seller has independent proof (checked tracking
 * on auspost.com.au) and the buyer hasn't acted yet.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-deliver:${clientKey(req)}`, { limit: 20 });
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
    .select("id, seller_id, status")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.seller_id !== user.id)
    return NextResponse.json({ error: "Only the seller can mark this delivered." }, { status: 403 });
  if (order.status !== "shipped")
    return NextResponse.json(
      { error: `Can't mark an order in "${order.status}" status as delivered.` },
      { status: 400 }
    );

  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const { error: updateError } = await admin
    .from("orders")
    .update({ status: "awaiting_confirmation", delivered_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
