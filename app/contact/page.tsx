import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: `Contact — ${BRAND.name}` };

const SELF_SERVE = [
  ["A problem with an order", "Report it from the order itself — the seller and our team both see it right away.", "/buying"],
  ["Payout or listing questions", "Manage listings, payouts and sales from your seller dashboard.", "/selling"],
  ["Account security", "Turn on two-factor authentication or review your sign-in options.", "/account/security"],
  ["How escrow and disputes work", "The full rundown on how payment holds and refunds work.", "/trust"],
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-14">
      <CompanyNav active="/contact" />

      <div className="mt-10 max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="display mt-2 text-3xl">Get in touch</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Most things are faster to resolve from inside your account — a few
          common ones are below. For anything else, email us directly.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SELF_SERVE.map(([title, body, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-card border border-line bg-card p-4 transition hover:border-ink/30"
          >
            <p className="text-sm font-semibold">{title}</p>
            <p className="spec mt-1 text-muted">{body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-card border border-line bg-card p-6">
        <h2 className="display text-xl">Email support</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          For anything not covered above — account issues, feedback, press,
          or something that just doesn&apos;t fit a category.
        </p>
        <a
          href={`mailto:${BRAND.supportEmail}`}
          className="btn btn-primary mt-4"
        >
          {BRAND.supportEmail}
        </a>
        <p className="spec mt-3 text-muted">
          A dispute reported from an order (see above) is usually fastest to
          resolve, since it keeps payment held while it&apos;s looked at.
        </p>
        <p className="spec mt-4 text-muted">
          <em>Placeholder — a committed response-time (SLA) belongs here once one&apos;s decided.</em>
        </p>
      </div>
    </div>
  );
}
