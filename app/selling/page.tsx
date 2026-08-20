import Link from "next/link";
import {
  querySellerListings,
  getSellerProfile,
  querySellerOrders,
} from "@/lib/seller-data";
import { getConnectAccountStatus } from "@/lib/stripe";
import { money, timeAgo, deadlineLabel } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";
import { ListingActions } from "@/components/ListingActions";
import { ConnectPayoutButton } from "@/components/ConnectPayoutButton";
import { SellerOrderActions } from "@/components/SellerOrderActions";
import { ShipOrderForm } from "@/components/ShipOrderForm";
import type { Order, Listing } from "@/lib/types";

type Tab = {
  key: string;
  label: string;
  orderMatch?: (o: Order) => boolean;
  listingMatch?: (l: Listing) => boolean;
};

const TABS: Tab[] = [
  { key: "listings", label: "Active listings", listingMatch: (l) => l.status === "active" },
  { key: "to-post", label: "To post", orderMatch: (o) => o.status === "paid" },
  { key: "in-transit", label: "In transit", orderMatch: (o) => o.status === "shipped" },
  {
    key: "awaiting-confirmation",
    label: "Awaiting buyer confirmation",
    orderMatch: (o) => o.status === "awaiting_confirmation" || o.status === "disputed",
  },
  { key: "released", label: "Funds released", orderMatch: (o) => o.status === "released" },
  { key: "sold", label: "Sold", listingMatch: (l) => l.status === "sold" },
];

type SP = { tab?: string };

export default async function SellingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [listings, profile, orders] = await Promise.all([
    querySellerListings(),
    getSellerProfile(),
    querySellerOrders(),
  ]);

  const activeTab = TABS.find((t) => t.key === sp.tab) ?? TABS[0];
  const tabListings = activeTab.listingMatch ? listings.filter(activeTab.listingMatch) : [];
  const tabOrders = activeTab.orderMatch ? orders.filter(activeTab.orderMatch) : [];

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

      <div className="no-scrollbar mt-8 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const count = t.listingMatch
            ? listings.filter(t.listingMatch).length
            : orders.filter(t.orderMatch!).length;
          return (
            <Link
              key={t.key}
              href={`/selling?tab=${t.key}`}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[12.5px] transition ${
                activeTab.key === t.key
                  ? "bg-ink font-semibold text-white"
                  : "border border-line hover:border-ink/40"
              }`}
            >
              {t.label}
              {count > 0 && ` (${count})`}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 overflow-hidden rounded-[10px] border border-line bg-card">
        {tabListings.length === 0 && tabOrders.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-[14px] text-muted">Nothing in this tab yet.</p>
          </div>
        )}

        {tabListings.map((l) => (
          <div key={l.id} className="flex items-center gap-4 border-b border-line p-3 last:border-0">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-ink">
              <ProductImage src={l.image} alt={l.title} category={l.category} seed={l.id} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${l.id}/${l.slug}`} className="line-clamp-1 text-[14px] font-semibold hover:text-trust">
                {l.title}
              </Link>
              <p className="spec text-muted">
                {l.category} · listed {timeAgo(l.createdAt)} · {l.condition}
              </p>
            </div>
            <div className="text-right">
              <p className="display text-[17px]">{money(l.price)}</p>
              {activeTab.key === "listings" && (
                <div className="mt-1 flex items-center justify-end gap-2">
                  <p className="spec text-good">Active</p>
                  <ListingActions id={l.id} active />
                </div>
              )}
              {activeTab.key === "sold" && <p className="spec mt-1 text-muted">Sold</p>}
            </div>
          </div>
        ))}

        {tabOrders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-4 border-b border-line p-3 last:border-0">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded bg-ink">
              <ProductImage
                src={o.listingImage}
                alt={o.listingTitle ?? "Listing"}
                category="Processors"
                seed={o.listingId}
                className="h-full w-full"
                showStockBadge={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[14px] font-semibold">{o.listingTitle ?? "Listing"}</p>
              <p className="spec mt-1 text-muted">
                {money(o.amount - o.platformFee + (o.shippingFee ?? 0))} to you (of {money(o.amount + (o.shippingFee ?? 0))} held) ·{" "}
                {timeAgo(o.createdAt)}
              </p>
              {activeTab.key === "to-post" && (
                <p className="spec mt-1 text-trust">Post within {BRAND.orderWindowHours}h — {deadlineLabel(o.createdAt)}</p>
              )}
              {o.status === "disputed" && (
                <p className="spec mt-1 font-semibold text-deal">
                  Buyer reported a problem{o.disputeReason ? `: “${o.disputeReason}”` : ""}
                </p>
              )}
              {o.status === "awaiting_confirmation" && o.deliveredAt && (
                <p className="spec mt-1 text-muted">
                  Awaiting buyer — auto-releases {deadlineLabel(o.deliveredAt)}
                </p>
              )}
            </div>
            {activeTab.key === "to-post" && <ShipOrderForm id={o.id} />}
            {activeTab.key === "in-transit" && <SellerOrderActions id={o.id} showDeliver />}
            {activeTab.key === "awaiting-confirmation" && <SellerOrderActions id={o.id} />}
            {activeTab.key === "released" && <p className="spec shrink-0 font-semibold text-good">Paid out</p>}
          </div>
        ))}
      </div>

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
