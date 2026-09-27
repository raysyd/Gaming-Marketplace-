import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";
import { refundOrder } from "@/lib/orders/refund";
import { releaseOrderPayment } from "@/lib/orders/release";
import { notifyOrder } from "@/lib/orders/notify";
import { revalidateTag } from "next/cache";

/**
 * Support settling an order from /admin: refund the buyer, or release to
 * the seller (including from "disputed", which neither party can do). The
 * same helpers the buyer, seller and cron use, so the money logic can't
 * drift. A chargeback still blocks release — that's settled in Stripe.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await params;
  const { action } = await req.json();
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const result =
    action === "refund"
      ? await refundOrder(id, admin)
      : action === "release"
        ? await releaseOrderPayment(id, admin, { allowDisputed: true })
        : { error: "Unknown action.", status: 400 };
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  if (action === "refund") {
    await notifyOrder(admin, id, "refunded");
    revalidateTag("listings", { expire: 0 });
  }
  console.info(`[admin] ${adminUser.email} ${action} order ${id}`);
  return NextResponse.json({ ok: true });
}
