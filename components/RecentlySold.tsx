import { money, timeAgo } from "@/lib/format";
import type { SoldListing } from "@/lib/market-data";

/** A plain list, not a Link rail — a sold listing has no live product page
 * worth sending someone to (it's gone), so this is read-only "here's proof
 * this place actually sells things," not a navigation surface. */
export function RecentlySold({ items, title = "Recently sold" }: { items: SoldListing[]; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="mt-14">
      <h2 className="display text-[24px]">{title}</h2>
      <ul className="mt-4 overflow-hidden panel">
        {items.map((s) => (
          <li
            key={s.listingId}
            className="flex items-center justify-between gap-3 border-b border-dashed border-line px-4 py-3 text-[14px] last:border-0"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="tag-label shrink-0 rounded bg-trust-soft px-1.5 py-0.5 text-trust">Sold</span>
              <span className="line-clamp-1">{s.title}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-[13px] text-muted">
              <span className="font-semibold text-ink">{money(s.price)}</span> · {timeAgo(s.soldAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
