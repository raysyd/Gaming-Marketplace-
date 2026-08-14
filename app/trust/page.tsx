import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `Trust & Safety — ${BRAND.name}` };

const SECTIONS: [string, string][] = [
  [
    "Your money is held, not forwarded",
    `When you pay, the funds sit with ${BRAND.name}. The seller can see the payment is waiting, which is what motivates them to ship quickly, but they can't touch it until delivery is confirmed.`,
  ],
  [
    "Three days to check the item",
    "Once it arrives you have 72 hours to report a problem. If the item isn't what was listed, the payment is refunded rather than released.",
  ],
  [
    "Verified sellers",
    "Sellers who have completed identity checks and a run of clean sales carry a Verified badge. You can filter the whole marketplace to verified sellers only.",
  ],
  [
    "Keep it on the platform",
    `If someone asks you to pay by bank transfer, gift card or direct app payment, that's the moment to stop. Off-platform payments have no protection, and it's the single most common way people get burned on marketplaces. Report it and we'll act on the account.`,
  ],
  [
    "Photograph the real thing",
    "Listings that use press renders instead of photos of the actual unit get removed. Buyers of secondhand hardware are buying a specific machine, not a model number.",
  ],
];

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14">
      <p className="eyebrow">Trust &amp; Safety</p>
      <h1 className="display mt-2 text-[36px]">
        How {BRAND.name} keeps a stranger&apos;s money safe.
      </h1>

      <div className="mt-10 space-y-8">
        {SECTIONS.map(([title, body]) => (
          <section key={title} className="border-t border-line pt-5">
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-[10px] border border-line bg-card p-6">
        <h2 className="display text-[20px]">Something gone wrong?</h2>
        <p className="mt-2 text-[14px] text-muted">
          Report it from the order in your account, or email {BRAND.supportEmail}.
          Do it inside 72 hours of delivery and the payment stays held while we
          look at it.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
        >
          Go to your orders
        </Link>
      </div>
    </div>
  );
}
