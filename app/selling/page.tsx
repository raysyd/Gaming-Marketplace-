import Link from "next/link";
import { Suspense } from "react";
import {
  querySellerListings,
  getSellerProfile,
  querySellerOrders,
} from "@/lib/seller-data";
import { getConnectAccountStatus } from "@/lib/stripe";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ConnectPayoutButton } from "@/components/ConnectPayoutButton";
import { SellingTabs } from "@/components/SellingTabs";

export default async function SellingPage() {
  const [listings, profile, orders] = await Promise.all([
    querySellerListings(),
    getSellerProfile(),
    querySellerOrders(),
  ]);

  const payoutStatus = profile?.stripeAccountId
    ? await getConnectAccountStatus(profile.stripeAccountId)
    : "none";

  const active = listings.filter((l) => l.status === "active");
  const gross = active.reduce((n, l) => n + l.price, 0);
  const fee = Math.round((gross * BRAND.feePercent) / 100);
  const held = orders.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "awaiting_confirmation" || o.status === "disputed");
  const heldTotal = held.reduce((n, o) => n + (o.amount - o.platformFee + (o.shippingFee ?? 0)), 0);

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Selling</p>
          <h1 className="display mt-2 text-4xl">Your shop</h1>
        </div>
        <Link
          href="/sell"
          className="btn btn-primary rgb-ring inline-flex items-center gap-2"
        >
          <span aria-hidden="true" className="text-xl leading-none">+</span> List an item
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(
          [
            ["Active listings", String(active.length), "M4 6h16M4 12h16M4 18h10", false],
            ["Listed value", money(gross), "M12 2v20M17 6.5c-1.2-1.4-2.9-2-5-2-2.8 0-5 1.4-5 3.6s2.2 3.1 5 3.8 5 1.5 5 3.9-2.2 3.7-5 3.7c-2.2 0-4-.8-5.3-2.3", true],
            ["Held in escrow", money(heldTotal), "M6 10V8a6 6 0 0112 0v2M5 10h14v11H5z", true],
            ["Next payout", money(gross - fee), "M3 12h14M13 6l6 6-6 6", true],
          ] as const
        ).map(([label, value, icon, isMoney]) => (
          <div key={label} className="flex items-center gap-4 rounded-card border border-line bg-card p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-trust-soft text-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg>
            </span>
            <div className="min-w-0">
              <p className="eyebrow">{label}</p>
              <p className={`display mt-1 text-3xl ${isMoney ? "text-trust" : ""}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* useSearchParams (reading the initial ?tab=) requires a Suspense
          boundary — see SellingTabs's own comment for why tab switching
          itself no longer touches the URL or the network at all. */}
      <Suspense>
        <SellingTabs listings={listings} orders={orders} />
      </Suspense>

      <div id="payouts" className="mt-8 rounded-card border border-line bg-card p-6">
        <h2 className="eyebrow">Payouts</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
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
