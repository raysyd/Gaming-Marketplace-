import { money, timeAgo } from "@/lib/format";
import type { SoldListing } from "@/lib/market-data";

/** A plain list, not a Link rail — a sold listing has no live product page
 * worth sending someone to (it's gone), so this is read-only "here's proof
 * this place actually sells things," not a navigation surface. */
export function RecentlySold({ items, title = "Recently sold" }: { items: SoldListing[]; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-6">
      <h2 className="display text-[18px]">{title}</h2>
      <ul className="mt-3 space-y-1.5">
        {items.map((s) => (
          <li
            key={s.listingId}
            className="flex items-center justify-between gap-3 rounded-md border border-line bg-card px-3 py-2 text-[13px]"
          >
            <span className="line-clamp-1">{s.title}</span>
            <span className="spec shrink-0 whitespace-nowrap text-muted">
              <span className="font-semibold text-good">{money(s.price)}</span> · {timeAgo(s.soldAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
