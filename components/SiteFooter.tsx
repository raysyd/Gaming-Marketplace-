import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LogoChip } from "./LogoChip";

export function SiteFooter() {
  return (
    <footer className="site-footer mt-20 text-white/70">
      <div className="relative mx-auto grid max-w-[1560px] gap-8 px-4 py-14 lg:px-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Link href="/" className="brand-mark" aria-label={`${BRAND.name} home`}>
            <LogoChip id="footer-chip" />
            <span className="display text-xl text-white">{BRAND.name}</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{BRAND.blurb}</p>
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
            ["Terms of Service", "/terms"],
            ["Privacy Policy", "/privacy"],
            ["Contact", "/contact"],
          ]}
        />
        <div>
          <h4 className="eyebrow text-white/50">How it works</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Sellers list. Buyers pay through {BRAND.name}.</li>
            <li>
              We hold the money until delivery is confirmed, then release it minus
              a {BRAND.feePercent}% fee.
            </li>
            <li>No stock, no warehouse — the platform is the product.</li>
          </ul>
        </div>
      </div>
      <p className="footer-wordmark" aria-hidden="true">{BRAND.name}</p>
      <div className="relative border-t border-white/10">
        <p className="hud mx-auto max-w-[1560px] px-4 py-4 text-xs lg:px-6">
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
      <ul className="mt-3 space-y-2 text-sm">
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
