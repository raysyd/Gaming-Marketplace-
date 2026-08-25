import { Suspense } from "react";
import { queryBuyerOrders } from "@/lib/seller-data";
import { getReviewableOrderIds } from "@/lib/reviews-data";
import { BuyingTabs } from "@/components/BuyingTabs";
import { BRAND } from "@/lib/brand";
import Link from "next/link";

export default async function BuyingPage() {
  const [orders, reviewableIds] = await Promise.all([queryBuyerOrders(), getReviewableOrderIds()]);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <p className="eyebrow">Buying</p>
      <h1 className="display mt-2 text-[30px]">Your orders</h1>

      {/* useSearchParams (reading the initial ?tab=) requires a Suspense
          boundary — see BuyingTabs's own comment for why tab switching
          itself no longer touches the URL or the network at all. */}
      <Suspense>
        <BuyingTabs orders={orders} reviewableIds={[...reviewableIds]} />
      </Suspense>

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
