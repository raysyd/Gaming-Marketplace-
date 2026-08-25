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
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <p className="eyebrow">Selling</p>
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

      {/* useSearchParams (reading the initial ?tab=) requires a Suspense
          boundary — see SellingTabs's own comment for why tab switching
          itself no longer touches the URL or the network at all. */}
      <Suspense>
        <SellingTabs listings={listings} orders={orders} />
      </Suspense>

      <div id="payouts" className="mt-8 rounded-[10px] border border-line bg-card p-5">
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
