import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: `Trust & Safety — ${BRAND.name}` };

// The escrow hold is the core claim the rest of the page backs up, so it
// gets pulled out of the grid below into its own hero callout instead of
// competing for attention as section one of five.
const HERO = [
  "Your money is held, not forwarded",
  `When you pay, the funds sit with ${BRAND.name}. The seller can see the payment is waiting, which is what motivates them to ship quickly, but they can't touch it until delivery is confirmed.`,
] as const;

const SECTIONS: [string, string, ReactNode][] = [
  [
    `${BRAND.orderWindowHours} hours to check the item`,
    `Once it arrives you have ${BRAND.orderWindowHours} hours to report a problem — or confirm sooner and release payment right away. If the item isn't what was listed, the payment is refunded rather than released. If you don't respond, it auto-releases after ${BRAND.orderWindowHours} hours so a seller who shipped a good item isn't held hostage.`,
    <ClockIcon key="clock" />,
  ],
  [
    "Verified sellers",
    "A Verified badge means identity checked through Stripe — never something a subscription or a fee can buy. You can filter the whole marketplace to verified sellers only.",
    <CheckIcon key="check" />,
  ],
  [
    "Keep it on the platform",
    `If someone asks you to pay by bank transfer, gift card or direct app payment, that's the moment to stop. Off-platform payments have no protection, and it's the single most common way people get burned on marketplaces. Report it and we'll act on the account.`,
    <WarningIcon key="warning" />,
  ],
  [
    "Photograph the real thing",
    "Listings that use press renders instead of photos of the actual unit get removed. Buyers of secondhand hardware are buying a specific machine, not a model number.",
    <CameraIcon key="camera" />,
  ],
];

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-14">
      <CompanyNav active="/trust" />

      <div className="mt-10 max-w-2xl">
        <p className="eyebrow">Trust &amp; Safety</p>
        <h1 className="display mt-2 text-4xl sm:text-[44px]">
          How {BRAND.name} keeps a stranger&apos;s money safe.
        </h1>
      </div>

      <div className="mt-8 flex items-start gap-4 rounded-card border border-trust bg-trust-soft p-6 sm:p-7">
        <LockIcon />
        <div>
          <h2 className="text-xl font-semibold text-trust">{HERO[0]}</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink">{HERO[1]}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(([title, body, icon]) => (
          <div key={title} className="rounded-card border border-line bg-card p-6">
            <div className="text-trust">{icon}</div>
            <h2 className="mt-3 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-line bg-card p-6">
        <h2 className="display text-xl">Something gone wrong?</h2>
        <p className="mt-2 text-sm text-muted">
          Report it from the order in your account, or email {BRAND.supportEmail}.
          Do it inside {BRAND.orderWindowHours} hours of delivery and the payment
          stays held while we look at it.
        </p>
        <Link
          href="/buying"
          className="btn btn-primary mt-4"
        >
          Go to your orders
        </Link>
      </div>
    </div>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function LockIcon() {
  return (
    <svg {...ICON_PROPS} className="h-9 w-9 shrink-0 text-icon" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...ICON_PROPS} className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v4.5l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...ICON_PROPS} className="h-7 w-7" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg {...ICON_PROPS} className="h-7 w-7" aria-hidden="true">
      <path d="M12 4 21 20H3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg {...ICON_PROPS} className="h-7 w-7" aria-hidden="true">
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M8 8l1.5-3h5L16 8" />
      <circle cx="12" cy="14" r="3.25" />
    </svg>
  );
}
