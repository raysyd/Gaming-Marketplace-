import Link from "next/link";
import { Icon } from "./ui/Icon";

export function Pagination({
  page,
  pages,
  makeHref,
}: {
  page: number;
  pages: number;
  makeHref: (p: number) => string;
}) {
  if (pages <= 1) return null;

  const window: number[] = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i < start + 5 && i <= pages; i++) window.push(i);

  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="btn btn-outline btn-sm" aria-label="Previous page">
          <Icon name="arrow-left" size={15} /> <span className="hidden sm:inline">Previous</span>
        </Link>
      )}
      {start > 1 && <span className="spec px-2 text-muted">…</span>}
      {window.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`btn btn-sm !w-9 !px-0 tabular-nums ${p === page ? "btn-dark" : "btn-ghost"}`}
        >
          {p}
        </Link>
      ))}
      {start + 5 <= pages && <span className="spec px-2 text-muted">…</span>}
      {page < pages && (
        <Link href={makeHref(page + 1)} className="btn btn-outline btn-sm" aria-label="Next page">
          <span className="hidden sm:inline">Next</span> <Icon name="arrow-right" size={15} className="btn-arrow" />
        </Link>
      )}
    </nav>
  );
}
