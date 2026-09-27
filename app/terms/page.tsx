import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: "Terms of Service" };

/**
 * Written to match what the code actually does (lib/brand.ts supplies
 * every number), the same way /privacy is. Every section is a plain
 * [heading, body] pair so a lawyer's edits land as text changes only.
 */
const SECTIONS: [string, React.ReactNode][] = [
  [
    "What we are",
    <>
      {BRAND.name} is a marketplace where people in {BRAND.regionLabel} buy and sell gaming PCs, parts and gear
      from each other. We don&apos;t own, inspect or ship anything listed here. The contract for each sale is between
      the buyer and the seller; we run the platform and hold the payment until the sale is settled.
    </>,
  ],
  [
    "Your account",
    <>
      You must be 18 or older, or have a parent or guardian&apos;s permission, and give us accurate details. You&apos;re
      responsible for everything done through your account, so keep your sign-in secure and tell us straight away if
      you think someone else has used it. One person, one account.
    </>,
  ],
  [
    "Listing an item",
    <>
      Only list things you own and can hand over. Describe them honestly, including faults, and use your own photos.
      You can&apos;t list stolen, counterfeit or recalled goods, anything illegal to sell in {BRAND.regionLabel},
      accounts, keys or digital goods you don&apos;t have the right to resell, or anything unrelated to gaming and PC
      hardware. We can remove any listing that breaks these rules.
    </>,
  ],
  [
    "Paying and the payment hold",
    <>
      Buyers pay through {BRAND.name} (processed by Stripe). The money is held and the seller is paid only when the sale
      is settled:
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>when the buyer confirms the item arrived or was collected;</li>
        <li>
          or, for a posted item, {BRAND.orderWindowHours} hours after Australia Post confirms delivery, or{" "}
          {BRAND.shippedAutoReleaseDays} days after posting if delivery isn&apos;t confirmed, as long as the buyer
          hasn&apos;t reported a problem;
        </li>
        <li>or when our support team settles a reported problem in the seller&apos;s favour.</li>
      </ul>
      <p className="mt-2">
        Pickup orders are only paid out when the buyer confirms collection. Sellers must post with tracking within{" "}
        {BRAND.orderWindowHours} hours of payment (or hand over a pickup within {BRAND.pickupHandoverDays} days); if they
        don&apos;t, the buyer is refunded automatically.
      </p>
    </>,
  ],
  [
    "Fees",
    <>
      Listing is free. When a sale is paid out, {BRAND.name} keeps {BRAND.feePercent}% of the item price. Shipping
      charged at checkout (a flat ${BRAND.shippingFlatRate} unless the seller offers free shipping) goes to the seller
      in full. Premium Seller is an optional subscription, billed monthly by Stripe until you cancel it. Sellers need a
      Stripe account to be paid, and Stripe&apos;s own terms apply to it.
    </>,
  ],
  [
    "Problems, returns and refunds",
    <>
      If an item doesn&apos;t arrive, or isn&apos;t what was listed, report it from your order before the payment is
      released. The payment stays held while the buyer and seller try to sort it out; if they can&apos;t, our support
      team decides whether to refund the buyer or pay the seller, based on the listing, messages, photos and tracking.
      A seller can refund a buyer at any time. Nothing in these terms limits your rights under the Australian Consumer
      Law — for example, consumer guarantees apply to goods sold by business sellers.
    </>,
  ],
  [
    "Keep it on the platform",
    <>
      Don&apos;t take payment or arrange a sale outside {BRAND.name} for something you found here. Off-platform payments
      aren&apos;t protected by the payment hold, and asking for one is grounds for suspension. Don&apos;t harass,
      threaten or mislead other members, or use the site to collect other people&apos;s details.
    </>,
  ],
  [
    "Suspension",
    <>
      We can remove content, hold a payment, or suspend an account that breaks these terms, puts other members at risk,
      or that we reasonably suspect of fraud. Payments already held are settled order by order. You can close your
      account at any time from{" "}
      <Link href="/account/delete" className="text-trust hover:underline">
        Account → Delete account
      </Link>
      ; accounts with order history are kept as transaction records.
    </>,
  ],
  [
    "Our responsibility",
    <>
      We try to keep {BRAND.name} running and safe, but we can&apos;t guarantee that every listing is accurate or every
      member is who they say they are. To the extent the law allows, we&apos;re not liable for losses caused by another
      member, and our total liability to you for any claim is limited to the fees we earned from the transaction it
      relates to. This doesn&apos;t exclude any liability the law says can&apos;t be excluded.
    </>,
  ],
  [
    "Changes and contact",
    <>
      We&apos;ll tell you by email or on the site before changes to these terms take effect. Questions go to{" "}
      <Link href="/contact" className="text-trust hover:underline">
        Contact
      </Link>{" "}
      or {BRAND.supportEmail}.
    </>,
  ],
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-14">
      <CompanyNav active="/terms" />

      <div className="mt-10">
        <p className="eyebrow">Legal</p>
        <h1 className="display mt-2 text-4xl sm:text-4xl">Terms of Service</h1>
      </div>

      <div className="mt-6 rounded-card border border-deal/40 bg-deal-soft px-5 py-4 text-sm leading-relaxed text-ink">
        <strong>Draft, not legal advice.</strong> These terms describe how {BRAND.name} actually works today. Have them
        reviewed by an Australian lawyer (Australian Consumer Law, marketplace and payments obligations) and add the
        operating entity&apos;s name, ABN and governing state before taking real payments.
      </div>

      <div className="mt-10 max-w-2xl space-y-8">
        {SECTIONS.map(([heading, body]) => (
          <section key={heading} className="border-t border-line pt-6">
            <h2 className="text-base font-semibold">{heading}</h2>
            <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
