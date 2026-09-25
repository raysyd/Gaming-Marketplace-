"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { money, timeAgo, deadlineLabel } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";
import { BuyerOrderActions } from "@/components/BuyerOrderActions";
import { ReviewForm } from "@/components/ReviewForm";
import type { Order } from "@/lib/types";

const TABS = [
  { key: "to-pay", label: "To pay", match: (o: Order) => o.status === "pending" },
  { key: "awaiting-postage", label: "Awaiting postage", match: (o: Order) => o.status === "paid" },
  { key: "in-transit", label: "In transit", match: (o: Order) => o.status === "shipped" },
  {
    key: "awaiting-confirmation",
    label: "Awaiting your confirmation",
    match: (o: Order) => o.status === "awaiting_confirmation" || o.status === "disputed",
  },
  {
    key: "complete",
    label: "Complete",
    match: (o: Order) => o.status === "released" || o.status === "refunded",
  },
] as const;

/** Same reasoning as SellingTabs — all of a buyer's orders are already
 * fetched in one request; the tab is just a client-side filter of them,
 * so switching one is instant instead of a full server round-trip. */
export function BuyingTabs({
  orders,
  reviewableIds,
}: {
  orders: Order[];
  /** Plain array, not a Set — kept as simple, ordinary-JSON as possible
   * crossing the server/client boundary rather than relying on React's
   * Map/Set serialization support. */
  reviewableIds: string[];
}) {
  const initialTab = useSearchParams().get("tab");
  const [activeKey, setActiveKey] = useState(
    TABS.find((t) => t.key === initialTab)?.key ?? TABS[1].key
  );
  const activeTab = TABS.find((t) => t.key === activeKey) ?? TABS[1];
  const items = orders.filter(activeTab.match);

  return (
    <>
      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => {
          const count = orders.filter(t.match).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveKey(t.key)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm transition ${
                activeTab.key === t.key
                  ? "border-trust font-semibold text-trust"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {count > 0 && <span className="rounded-full bg-trust-soft px-2 py-0.5 text-xs font-semibold text-trust">{count}</span>}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-line bg-card p-14 text-center">
          <h2 className="display text-xl">Nothing here</h2>
          <p className="mt-2 text-sm text-muted">
            {activeTab.key === "to-pay"
              ? "Orders waiting on payment show up here."
              : "Buy something and it'll show up in the right tab as it moves."}
          </p>
          <Link
            href="/shop"
            className="btn btn-primary mt-4"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-4 transition hover:border-ink/25"
            >
              <div className="h-[72px] w-24 shrink-0 overflow-hidden rounded-lg bg-ink">
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
                <Link
                  href={o.listingSlug ? `/product/${o.listingId}/${o.listingSlug}` : "#"}
                  className="line-clamp-1 text-sm font-semibold hover:text-trust"
                >
                  {o.listingTitle ?? "Listing"}
                </Link>
                <p className="spec mt-1 text-muted">
                  {money(o.amount + (o.shippingFee ?? 0))}
                  {o.quantity > 1 ? ` · Qty ${o.quantity}` : ""} · from {o.sellerName ?? "seller"}
                  {o.fulfillmentMethod === "pickup" ? " · Local pickup" : ""} · ordered{" "}
                  {timeAgo(o.createdAt)}
                </p>
                {o.status === "disputed" && (
                  <p className="spec mt-1 font-semibold text-deal">Problem reported — under review</p>
                )}
                {o.status === "awaiting_confirmation" && o.deliveredAt && (
                  <p className="spec mt-1 text-trust">
                    Confirm within {BRAND.orderWindowHours}h of {o.fulfillmentMethod === "pickup" ? "the seller marking it ready" : "delivery"} —{" "}
                    {deadlineLabel(o.deliveredAt)}, then it auto-releases.
                  </p>
                )}
              </div>
              {(o.status === "shipped" || o.status === "awaiting_confirmation") && (
                <BuyerOrderActions id={o.id} fulfillmentMethod={o.fulfillmentMethod} />
              )}
              {o.status === "released" && reviewableIds.includes(o.id) && (
                <ReviewForm orderId={o.id} listingTitle={o.listingTitle ?? "this item"} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
