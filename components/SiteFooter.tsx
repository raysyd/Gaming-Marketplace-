import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-chrome text-white/70">
      <div className="mx-auto grid max-w-[1560px] gap-8 px-4 py-12 lg:px-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <span className="display text-[20px] text-white">{BRAND.name}</span>
          <span className="rgb-text display text-[20px]">.</span>
          <p className="mt-2 max-w-xs text-[13px]">{BRAND.blurb}</p>
        </div>
        <FooterCol
          title="Buy"
          links={[
            ["Browse everything", "/shop"],
            ["Price drops", "/shop?deals=1"],
            ["Prebuilt PCs", "/shop?category=full-systems&sub=gaming-pcs"],
            ["Graphics cards", "/shop?category=pc-parts-and-components&sub=graphics-cards"],
            ["Your orders", "/buying"],
          ]}
        />
        <FooterCol
          title="Sell"
          links={[
            ["List an item", "/sell"],
            ["Your listings", "/selling"],
            ["Messages", "/messages"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["About", "/about"],
            ["Trust & Safety", "/trust"],
            ["Privacy Policy", "/privacy"],
            ["Contact", "/contact"],
          ]}
        />
        <div>
          <h4 className="eyebrow text-white/50">How it works</h4>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>Sellers list. Buyers pay through {BRAND.name}.</li>
            <li>
              We hold the money until delivery is confirmed, then release it minus
              a {BRAND.feePercent}% fee.
            </li>
            <li>No stock, no warehouse — the platform is the product.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="spec mx-auto max-w-[1560px] px-4 lg:px-6 py-4">
          © {new Date().getFullYear()} {BRAND.name} ·{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-deal">
            {BRAND.supportEmail}
          </a>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="eyebrow text-white/50">{title}</h4>
      <ul className="mt-3 space-y-2 text-[13px]">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition hover:text-deal">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
