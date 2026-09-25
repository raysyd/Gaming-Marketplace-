import Link from "next/link";

/**
 * The standard top of a page: breadcrumb or eyebrow, a display heading,
 * an optional sentence under it, and actions on the right. Every inner
 * page uses this so headings sit at the same size and rhythm site-wide.
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  actions,
  crumbs,
  size = "md",
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: [string, string?][];
  size?: "md" | "lg";
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 max-w-3xl">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
            {crumbs.map(([label, href], i) => (
              <span key={label + i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className="text-line-strong">/</span>}
                {href ? (
                  <Link href={href} className="transition hover:text-ink">{label}</Link>
                ) : (
                  <span className="text-ink">{label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="eyebrow mb-2.5 flex items-center gap-2">{eyebrow}</p>}
        <h1 className={`display ${size === "lg" ? "text-[clamp(36px,5vw,56px)]" : "text-[clamp(30px,4vw,42px)]"}`}>{title}</h1>
        {lede && <p className="lede mt-3 max-w-2xl">{lede}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
