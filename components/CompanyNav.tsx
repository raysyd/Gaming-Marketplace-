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
 * link to each other from the footer.
 */
export function CompanyNav({ active }: { active: string }) {
  return (
    <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line pb-3">
      {LINKS.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-[12.5px] transition ${
            href === active
              ? "bg-ink font-semibold text-white"
              : "border border-line hover:border-ink/40"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
