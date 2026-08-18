import { BRAND } from "@/lib/brand";

export const metadata = { title: `Privacy Policy — ${BRAND.name}` };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="display mt-2 text-[32px]">Privacy Policy</h1>

      <div className="mt-4 rounded-[10px] border border-deal/40 bg-deal-soft px-4 py-3 text-[13.5px] text-ink">
        <strong>Draft, not legal advice.</strong> This is a starting template
        describing what the codebase actually does with data today. Before
        {" "}{BRAND.name}{" "} takes real users, have this reviewed against
        Australian privacy law (the Privacy Act, APPs) and updated to match —
        this page alone doesn&apos;t make the site compliant.
      </div>

      <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-ink">
        <section>
          <h2 className="text-[16px] font-semibold">What we collect</h2>
          <p className="mt-2 text-muted">
            Your email address and authentication details (via Supabase Auth),
            anything you put in a listing, message, or offer, and basic usage
            data needed to run the marketplace — wishlist items, order status,
            seller ratings.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Who we share it with</h2>
          <p className="mt-2 text-muted">
            Supabase (database, auth, file storage), Stripe (payments, once
            connected), and our transactional email provider (for sign-in
            links and order updates). We don&apos;t sell personal data.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Your account</h2>
          <p className="mt-2 text-muted">
            You can delete your account and its data at any time — see
            Account → Delete account once signed in. Accounts with order
            history are retained for that transaction&apos;s records; contact
            us to request removal.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold">Contact</h2>
          <p className="mt-2 text-muted">
            Questions about this policy: {BRAND.supportEmail}
          </p>
        </section>
      </div>
    </div>
  );
}
