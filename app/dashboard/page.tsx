import Link from "next/link";
import { queryListings } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { ProductImage } from "@/components/ProductImage";

export default async function DashboardPage() {
  const { items: all } = await queryListings({ perPage: 200 });
  const mine = all.filter((l) => l.sellerId === "u-marcus").slice(0, 12);
  const gross = mine.reduce((n, l) => n + l.price, 0);
  const fee = Math.round((gross * BRAND.feePercent) / 100);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-10">
      <p className="eyebrow">Seller account</p>
      <h1 className="display mt-2 text-[30px]">Your shop</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active listings", String(mine.length)],
          ["Listed value", money(gross)],
          ["Held in escrow", money(0)],
          ["Next payout", money(gross - fee)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[10px] border border-line bg-card p-4">
            <p className="eyebrow">{label}</p>
            <p className="display mt-1.5 text-[24px]">{value}</p>
          </div>
        ))}
      </div>

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
              <p className="spec text-good">Active</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-[10px] border border-line bg-card p-5">
        <h2 className="eyebrow">Payouts</h2>
        <p className="mt-2 max-w-lg text-[14px] text-muted">
          Connect a payout account to receive money when your sales are delivered.
          Until then, sales stay held in escrow.
        </p>
        <button className="mt-3 rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white">
          Connect payout account
        </button>
      </div>
    </div>
  );
}
