import Link from "next/link";
import { queryBuyerOrders } from "@/lib/seller-data";
import { money, timeAgo, deadlineLabel } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";
import { BuyerOrderActions } from "@/components/BuyerOrderActions";
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

type SP = { tab?: string };

export default async function BuyingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const orders = await queryBuyerOrders();
  const activeTab = TABS.find((t) => t.key === sp.tab) ?? TABS[1];
  const items = orders.filter(activeTab.match);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <p className="eyebrow">Buying</p>
      <h1 className="display mt-2 text-[30px]">Your orders</h1>

      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const count = orders.filter(t.match).length;
          return (
            <Link
              key={t.key}
              href={`/buying?tab=${t.key}`}
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

      {items.length === 0 ? (
        <div className="mt-6 rounded-[10px] border border-dashed border-line bg-card p-12 text-center">
          <h2 className="display text-[20px]">Nothing here</h2>
          <p className="mt-2 text-[14px] text-muted">
            {activeTab.key === "to-pay"
              ? "Orders waiting on payment show up here."
              : "Buy something and it'll show up in the right tab as it moves."}
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-4 rounded-[10px] border border-line bg-card p-4"
            >
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
                <Link
                  href={o.listingSlug ? `/product/${o.listingId}/${o.listingSlug}` : "#"}
                  className="line-clamp-1 text-[14px] font-semibold hover:text-trust"
                >
                  {o.listingTitle ?? "Listing"}
                </Link>
                <p className="spec mt-1 text-muted">
                  {money(o.amount + (o.shippingFee ?? 0))} · from {o.sellerName ?? "seller"} · ordered{" "}
                  {timeAgo(o.createdAt)}
                </p>
                {o.status === "disputed" && (
                  <p className="spec mt-1 font-semibold text-deal">Problem reported — under review</p>
                )}
                {o.status === "awaiting_confirmation" && o.deliveredAt && (
                  <p className="spec mt-1 text-trust">
                    Confirm within {BRAND.orderWindowHours}h of delivery — {deadlineLabel(o.deliveredAt)},
                    then it auto-releases.
                  </p>
                )}
              </div>
              {(o.status === "shipped" || o.status === "awaiting_confirmation") && (
                <BuyerOrderActions id={o.id} />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="spec mt-6 text-muted">
        {BRAND.name} holds payment until you confirm delivery — see{" "}
        <Link href="/trust" className="font-semibold text-trust hover:underline">
          how buyer protection works
        </Link>
        .
      </p>
    </div>
  );
}
