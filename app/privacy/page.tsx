import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: `Privacy Policy — ${BRAND.name}` };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-14">
      <CompanyNav active="/privacy" />

      <div className="mt-10">
        <p className="eyebrow">Legal</p>
        <h1 className="display mt-2 text-4xl sm:text-4xl">Privacy Policy</h1>
      </div>

      <div className="mt-6 rounded-card border border-deal/40 bg-deal-soft px-5 py-4 text-sm leading-relaxed text-ink">
        <strong>Draft, not legal advice.</strong> This describes what the
        codebase actually does with data today. Before {BRAND.name} takes
        real users, have this reviewed against Australian privacy law (the
        Privacy Act, the Australian Privacy Principles) and updated to
        match — this page alone doesn&apos;t make the site compliant.
      </div>

      <div className="mt-10 max-w-2xl space-y-8">
        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">What we collect</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your email address and authentication details (via Supabase
            Auth), anything you put in a listing, message, offer or review,
            and the usage data needed to run the marketplace — wishlist
            items, order and payment status, seller reputation.
          </p>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">Who we share it with</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Supabase (database, auth, file storage), Stripe (payments,
            payouts and the Premium Seller subscription, once connected),
            and our transactional email provider (sign-in links and order
            updates). We don&apos;t sell personal data, and we don&apos;t
            share more with any of them than each needs to do its job.
          </p>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">Cookies and sessions</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A session cookie set by Supabase Auth keeps you signed in — that&apos;s
            it; there&apos;s no ad or tracking network on this site. A theme
            preference and your cart may be stored in your browser&apos;s local
            storage, which never leaves your device.
          </p>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">How long we keep it</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Account and listing data lives as long as your account does.
            Completed order records are kept as transaction history — that&apos;s
            also why an account with order history can&apos;t self-delete
            instantly (see below).
          </p>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">Your account, your choices</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            You can edit or delete most of your profile at any time from{" "}
            <Link href="/account" className="text-trust hover:underline">
              Account settings
            </Link>
            , and delete your account and its data from{" "}
            <Link href="/account/delete" className="text-trust hover:underline">
              Account → Delete account
            </Link>
            . Accounts with order history are retained for those
            transactions&apos; records — contact us to request removal.
          </p>
        </section>

        <section className="border-t border-line pt-6">
          <h2 className="text-base font-semibold">Contact</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Questions about this policy — see{" "}
            <Link href="/contact" className="text-trust hover:underline">
              Contact
            </Link>{" "}
            or email {BRAND.supportEmail}.
          </p>
        </section>
      </div>
    </div>
  );
}
