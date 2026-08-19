import Link from "next/link";
import { querySellerListings, getSellerProfile, querySellerOrders } from "@/lib/seller-data";
import { getConnectAccountStatus } from "@/lib/stripe";
import { money, timeAgo } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";
import { ListingActions } from "@/components/ListingActions";
import { ConnectPayoutButton } from "@/components/ConnectPayoutButton";
import { SellerOrderActions } from "@/components/SellerOrderActions";

export default async function DashboardPage() {
  const [mine, profile, orders] = await Promise.all([
    querySellerListings().then((l) => l.slice(0, 50)),
    getSellerProfile(),
    querySellerOrders(),
  ]);
  const active = mine.filter((l) => l.status === "active");
  const gross = active.reduce((n, l) => n + l.price, 0);
  const fee = Math.round((gross * BRAND.feePercent) / 100);

  const held = orders.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered");
  const heldTotal = held.reduce((n, o) => n + (o.amount - o.platformFee), 0);

  // profiles.stripe_account_id being set only means onboarding was
  // *started* — check Stripe itself for whether it's actually finished.
  const payoutStatus = profile?.stripeAccountId
    ? await getConnectAccountStatus(profile.stripeAccountId)
    : "none";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <p className="eyebrow">Seller account</p>
      <h1 className="display mt-2 text-[30px]">Your shop</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active listings", String(active.length)],
          ["Listed value", money(gross)],
          ["Held in escrow", money(heldTotal)],
          ["Next payout", money(gross - fee)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[10px] border border-line bg-card p-4">
            <p className="eyebrow">{label}</p>
            <p className="display mt-1.5 text-[24px]">{value}</p>
          </div>
        ))}
      </div>

      {held.length > 0 && (
        <>
          <div className="mt-8 flex items-baseline justify-between">
            <h2 className="display text-[22px]">Orders awaiting delivery</h2>
          </div>
          <div className="mt-3 overflow-hidden rounded-[10px] border border-line bg-card">
            {held.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-4 border-b border-line p-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="line-clamp-1 text-[14px] font-semibold">
                    {o.listingTitle ?? "Listing"}
                  </p>
                  <p className="spec text-muted">
                    {money(o.amount - o.platformFee)} to you · {o.status} · {timeAgo(o.createdAt)}
                  </p>
                </div>
                <SellerOrderActions id={o.id} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="display text-[22px]">Listings</h2>
        <Link href="/sell" className="text-[13px] font-semibold text-trust">
          List an item →
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-[10px] border border-line bg-card">
        {mine.map((l) => (
          <div
            key={l.id}
            className="flex items-center gap-4 border-b border-line p-3 last:border-0"
          >
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-ink">
              <ProductImage
                src={l.image}
                alt={l.title}
                category={l.category}
                seed={l.id}
                className="h-full w-full"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${l.id}/${l.slug}`}
                className="line-clamp-1 text-[14px] font-semibold hover:text-trust"
              >
                {l.title}
              </Link>
              <p className="spec text-muted">
                {l.category} · listed {timeAgo(l.createdAt)} · {l.condition}
              </p>
            </div>
            <div className="text-right">
              <p className="display text-[17px]">{money(l.price)}</p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <p className={`spec ${l.status === "active" ? "text-good" : "text-muted"}`}>
                  {l.status === "active" ? "Active" : "Taken down"}
                </p>
                <ListingActions id={l.id} active={l.status === "active"} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[10px] border border-line bg-card p-5">
        <h2 className="eyebrow">Payouts</h2>
        <p className="mt-2 max-w-lg text-[14px] text-muted">
          {payoutStatus === "active"
            ? "Payout account connected. Money released from escrow lands here automatically."
            : payoutStatus === "pending"
              ? "Almost there — Stripe still needs a bit more information before this account can receive payouts."
              : "Connect a payout account to receive money when your sales are delivered. Until then, sales stay held in escrow."}
        </p>
        <ConnectPayoutButton status={payoutStatus} />
      </div>
    </div>
  );
}
