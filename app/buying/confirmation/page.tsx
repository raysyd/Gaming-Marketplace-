import Link from "next/link";
import { notFound } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * Reads straight from Stripe using the session id in the redirect URL,
 * not from our own `orders` table — the webhook that actually writes that
 * row can lag the buyer's browser back here by a second or two, and this
 * page has to be correct the instant Stripe redirects, not "usually
 * correct a moment later". Stripe's own payment_status is the one thing
 * guaranteed fresh at this exact moment.
 */
export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) notFound();

  const stripe = await getStripe();
  if (!stripe) notFound();

  const session = await stripe.checkout.sessions
    .retrieve(session_id, { expand: ["line_items"] })
    .catch(() => null);
  if (!session || session.payment_status !== "paid") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  // Own session only — a session id is an unguessable random string, but
  // this is a free extra check against someone else's purchase confirmation
  // page landing in this one's history.
  if (user && session.metadata?.buyerId && session.metadata.buyerId !== user.id) notFound();

  const sellerId = session.metadata?.sellerId;
  let sellerName = "the seller";
  if (sellerId && supabase) {
    const { data: sellerListing } = await supabase
      .from("listings")
      .select("seller_name")
      .eq("seller_id", sellerId)
      .limit(1)
      .maybeSingle();
    sellerName = sellerListing?.seller_name ?? sellerName;
  }

  const items = (session.line_items?.data ?? []).filter((li) => li.description !== "Shipping");
  const shippingLine = session.line_items?.data.find((li) => li.description === "Shipping");

  return (
    <div className="mx-auto max-w-[640px] px-4 py-16">
      <p className="eyebrow text-good">Order confirmed</p>
      <h1 className="display mt-2 text-[clamp(30px,4vw,42px)]">Thanks — it&apos;s on its way to being shipped.</h1>
      <p className="spec mt-2 text-muted">
        Order {session.payment_intent ? String(session.payment_intent).slice(-8).toUpperCase() : session.id.slice(-8).toUpperCase()}
      </p>

      <div className="mt-6 overflow-hidden panel">
        {items.map((li) => (
          <div key={li.id} className="flex justify-between border-b border-line px-4 py-3 last:border-0">
            <span className="text-[14px]">{li.description}</span>
            <span className="text-[14px] font-semibold">{money((li.amount_total ?? 0) / 100)}</span>
          </div>
        ))}
        {shippingLine && (
          <div className="flex justify-between border-b border-line px-4 py-3 text-muted">
            <span className="text-[14px]">Shipping</span>
            <span className="text-[14px]">{money((shippingLine.amount_total ?? 0) / 100)}</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-3 font-semibold">
          <span>Total paid</span>
          <span className="display text-[18px]">{money((session.amount_total ?? 0) / 100)}</span>
        </div>
      </div>

      <p className="spec mt-4 text-muted">Sold by {sellerName}</p>

      <div className="mt-8 panel p-5">
        <h2 className="eyebrow">What happens next</h2>
        <ol className="mt-2 space-y-1.5 text-[14px] text-muted">
          <li>1. {BRAND.name} holds your payment — the seller hasn&apos;t been paid yet.</li>
          <li>2. The seller posts within {BRAND.orderWindowHours} hours and adds tracking.</li>
          <li>
            3. Once it arrives, confirm it from{" "}
            <Link href="/buying" className="inline-link">
              your orders
            </Link>{" "}
            and payment releases to the seller.
          </li>
        </ol>
      </div>

      <Link
        href="/buying"
        className="btn btn-dark btn-sm mt-6"
      >
        Go to your orders
      </Link>
    </div>
  );
}
