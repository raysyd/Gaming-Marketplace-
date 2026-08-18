import Link from "next/link";
import { queryBuyerOrders } from "@/lib/seller-data";
import { money, timeAgo } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { BuyerOrderActions } from "@/components/BuyerOrderActions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Payment held",
  shipped: "Shipped",
  delivered: "Delivered",
  released: "Paid out to seller",
  refunded: "Refunded",
};

export default async function OrdersPage() {
  const orders = await queryBuyerOrders();

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <p className="eyebrow">Your purchases</p>
      <h1 className="display mt-2 text-[30px]">Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-[10px] border border-dashed border-line bg-card p-12 text-center">
          <h2 className="display text-[20px]">No orders yet</h2>
          <p className="mt-2 text-[14px] text-muted">
            Buy something and it&apos;ll show up here, with payment held until
            you confirm delivery.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-[10px] border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold">{o.listingTitle ?? "Listing"}</p>
                  <p className="spec mt-1 text-muted">
                    {money(o.amount)} · {STATUS_LABEL[o.status] ?? o.status} · ordered{" "}
                    {timeAgo(o.createdAt)}
                  </p>
                </div>
                {["paid", "shipped", "delivered"].includes(o.status) && (
                  <BuyerOrderActions id={o.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="spec mt-6 text-muted">
        {BRAND.name} holds payment until you confirm delivery. Only release it
        once the item has actually arrived and matches the listing.
      </p>
    </div>
  );
}
