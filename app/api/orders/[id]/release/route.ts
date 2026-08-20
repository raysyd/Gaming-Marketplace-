import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { releaseOrderPayment } from "@/lib/orders/release";

/**
 * Buyer confirms delivery -> transfer the seller's cut out of the
 * platform's own Stripe balance. The actual transfer lives in
 * lib/orders/release.ts, shared with the 48-hour auto-release cron
 * (app/api/cron/auto-release) so there's exactly one place that can ever
 * move this money.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = rateLimit(`order-release:${clientKey(req)}`, { limit: 10 });
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

  // Read through the user's own session — RLS's "order parties read"
  // policy is what actually proves this user is allowed to see this row.
  // Only the buyer can trigger a release this way (the cron is the other
  // path in, and it isn't scoped to any one user at all).
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id")
    .eq("id", id)
    .single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.buyer_id !== user.id)
    return NextResponse.json({ error: "Only the buyer can release payment." }, { status: 403 });

  // No UPDATE policy exists on orders (only the SELECT above) — the actual
  // transfer + status flip has to go through the admin client, now that
  // the authorization check above has passed.
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json({ error: "Server isn't configured for this write." }, { status: 500 });

  const result = await releaseOrderPayment(id, admin);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
