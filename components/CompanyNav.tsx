import Link from "next/link";

const LINKS = [
  ["About", "/about"],
  ["Trust & Safety", "/trust"],
  ["Contact", "/contact"],
  ["Privacy Policy", "/privacy"],
] as const;

/**
 * Shared local nav across the four company/legal pages, so they read as
 * one consistent "Company" section instead of four pages that happen to
 * link to each other from the footer. Styled as underline tabs rather
 * than a row of pill buttons — reads as one section with four views,
 * which is the point.
 */
export function CompanyNav({ active }: { active: string }) {
  return (
    <nav className="no-scrollbar flex gap-5 overflow-x-auto border-b border-line">
      {LINKS.map(([label, href]) => {
        const isActive = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-3 text-[13px] font-semibold transition ${
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
