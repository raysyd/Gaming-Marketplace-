import Link from "next/link";

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
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="rounded border border-line px-3 py-2 text-[13px] hover:border-ink/40">
          Previous
        </Link>
      )}
      {start > 1 && <span className="spec px-2 text-muted">…</span>}
      {window.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`rounded px-3 py-2 text-[13px] ${
            p === page
              ? "bg-ink font-semibold text-white"
              : "border border-line hover:border-ink/40"
          }`}
        >
          {p}
        </Link>
      ))}
      {start + 5 <= pages && <span className="spec px-2 text-muted">…</span>}
      {page < pages && (
        <Link href={makeHref(page + 1)} className="rounded border border-line px-3 py-2 text-[13px] hover:border-ink/40">
          Next
        </Link>
      )}
    </nav>
  );
}
