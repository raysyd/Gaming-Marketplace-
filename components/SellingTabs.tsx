"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { money, timeAgo, deadlineLabel } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";
import { ListingActions } from "@/components/ListingActions";
import { DraftListingActions } from "@/components/DraftListingActions";
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
  { key: "drafts", label: "Drafts", listingMatch: (l) => l.status === "draft" },
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

/**
 * Every tab's data (listings + orders) is already fetched together by the
 * server page in one Promise.all — the tab itself was only ever a filter
 * of what's already in hand. This used to be a <Link href="?tab=X">, which
 * meant clicking a tab re-ran the whole server request for data that was
 * already sitting in the browser. Switching tabs is now just local state:
 * instant, no network request. The starting tab still honours a ?tab=
 * link (an email or a bookmark can still open straight to "drafts"), it
 * just doesn't keep rewriting the URL on every click after that.
 */
export function SellingTabs({ listings, orders }: { listings: Listing[]; orders: Order[] }) {
  const initialTab = useSearchParams().get("tab");
  const [activeKey, setActiveKey] = useState(
    TABS.find((t) => t.key === initialTab)?.key ?? TABS[0].key
  );
  const activeTab = TABS.find((t) => t.key === activeKey) ?? TABS[0];
  const tabListings = activeTab.listingMatch ? listings.filter(activeTab.listingMatch) : [];
  const tabOrders = activeTab.orderMatch ? orders.filter(activeTab.orderMatch) : [];

  return (
    <>
      <div className="no-scrollbar mt-8 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const count = t.listingMatch
            ? listings.filter(t.listingMatch).length
            : orders.filter(t.orderMatch!).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveKey(t.key)}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[12.5px] transition ${
                activeTab.key === t.key
                  ? "bg-ink font-semibold text-white"
                  : "border border-line hover:border-ink/40"
              }`}
            >
              {t.label}
              {count > 0 && ` (${count})`}
            </button>
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
              {activeTab.key === "drafts" ? (
                // A draft has no public page to link to (it's never
                // status = "active", so /product/[id] can't resolve it) —
                // "Continue editing" on the right is the only way in.
                <p className="line-clamp-1 text-[14px] font-semibold">{l.title || "Untitled draft"}</p>
              ) : (
                <Link href={`/product/${l.id}/${l.slug}`} className="line-clamp-1 text-[14px] font-semibold hover:text-trust">
                  {l.title}
                </Link>
              )}
              <p className="spec text-muted">
                {l.category} · {activeTab.key === "drafts" ? "started" : "listed"} {timeAgo(l.createdAt)} · {l.condition}
              </p>
            </div>
            <div className="text-right">
              <p className="display text-[17px]">{l.price ? money(l.price) : "No price yet"}</p>
              {activeTab.key === "listings" && (
                <div className="mt-1 flex items-center justify-end gap-2">
                  <p className="spec text-good">Active</p>
                  <ListingActions id={l.id} active />
                </div>
              )}
              {activeTab.key === "sold" && <p className="spec mt-1 text-muted">Sold</p>}
              {activeTab.key === "drafts" && (
                <div className="mt-1">
                  <DraftListingActions id={l.id} />
                </div>
              )}
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
                {money(o.amount - o.platformFee + (o.shippingFee ?? 0))} to you (of {money(o.amount + (o.shippingFee ?? 0))} held)
                {o.quantity > 1 ? ` · Qty ${o.quantity}` : ""}
                {o.fulfillmentMethod === "pickup" ? " · Local pickup" : ""} ·{" "}
                {timeAgo(o.createdAt)}
              </p>
              {activeTab.key === "to-post" && (
                <p className="spec mt-1 text-trust">
                  {o.fulfillmentMethod === "pickup" ? "Ready for pickup within" : "Post within"}{" "}
                  {BRAND.orderWindowHours}h — {deadlineLabel(o.createdAt)}
                </p>
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
            {activeTab.key === "to-post" && <ShipOrderForm id={o.id} fulfillmentMethod={o.fulfillmentMethod} />}
            {activeTab.key === "in-transit" && <SellerOrderActions id={o.id} showDeliver />}
            {activeTab.key === "awaiting-confirmation" && <SellerOrderActions id={o.id} />}
            {activeTab.key === "released" && <p className="spec shrink-0 font-semibold text-good">Paid out</p>}
          </div>
        ))}
      </div>
    </>
  );
}
