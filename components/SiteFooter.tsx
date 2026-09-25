import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Logo } from "./ui/Logo";
import { Icon } from "./ui/Icon";
import { Traces } from "./ui/Illustrations";

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-chrome text-[#cfd6cf]">
      <Traces className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div className="relative mx-auto max-w-[1480px] px-4 lg:px-8">
        {/* The three promises, as a row of "pads" across the top edge. */}
        <ul className="grid gap-px overflow-hidden border-b border-white/10 sm:grid-cols-3">
          {(
            [
              ["lock", "Money held in escrow", "Released only when you confirm it arrived."],
              ["shield", "Real sellers, verified", "Identity checked through Stripe, never bought."],
              ["tag", "Free to list", `You pay ${BRAND.feePercent}% when it sells. Nothing before.`],
            ] as const
          ).map(([icon, title, body]) => (
            <li key={title} className="flex items-start gap-3 py-7 sm:pr-6">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#d4a73a]/40 bg-[#d4a73a]/10 text-[#f3cf6f]">
                <Icon name={icon} size={19} />
              </span>
              <div>
                <p className="text-[14.5px] font-semibold text-[#f3efe6]">{title}</p>
                <p className="mt-0.5 text-[13px] text-[#9aa59d]">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="logo-link inline-block" aria-label={`${BRAND.name} home`}>
              <Logo size={30} tone="light" />
            </Link>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-[#9aa59d]">{BRAND.blurb}</p>
            <p className="hand mt-5 -rotate-2 text-[24px] text-[#ff8a57]">made by gamers, for their old gear</p>
          </div>
          <FooterCol
            title="Buy"
            links={[
              ["Browse everything", "/shop"],
              ["Price drops", "/shop?deals=1"],
              ["Prebuilt PCs", "/shop?category=full-systems&sub=gaming-pcs"],
              ["Graphics cards", "/shop?category=pc-parts-and-components&sub=graphics-cards"],
              ["PC Finder quiz", "/pc-finder"],
              ["Your orders", "/buying"],
            ]}
          />
          <FooterCol
            title="Sell"
            links={[
              ["List an item", "/sell"],
              ["Your listings", "/selling"],
              ["Messages", "/messages"],
              ["Build showcase", "/builds"],
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
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 py-5 text-[12.5px] text-[#8b958d] sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} {BRAND.name} · Prices in {BRAND.currency} · Ships anywhere in {BRAND.regionLabel}
          </p>
          <a href={`mailto:${BRAND.supportEmail}`} className="inline-flex items-center gap-1.5 transition hover:text-[#ff8a57]">
            <Icon name="mail" size={14} />
            {BRAND.supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="tag-label text-[#d4a73a]">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-[14px]">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="footer-link">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
