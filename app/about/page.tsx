import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: `About — ${BRAND.name}` };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-14">
      <CompanyNav active="/about" />

      <div className="mt-10 max-w-2xl">
        <p className="eyebrow">About</p>
        <h1 className="display mt-2 text-[40px] sm:text-[48px]">{BRAND.tagline}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-muted">{BRAND.blurb}</p>
      </div>

      {/* The identity-defining claim, pulled out of the section stack below
          into its own callout — this is the one thing about the model that
          most needs to land before anything else. */}
      <div className="mt-8 rounded-[10px] border border-trust bg-trust-soft p-6 sm:p-7">
        <h2 className="text-[18px] font-semibold text-trust">No warehouse, no stock</h2>
        <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink">
          {BRAND.name} doesn&apos;t hold inventory. Every listing is a real
          seller&apos;s own hardware — the box they upgraded out of, the parts
          left over from a build. We&apos;re the layer that makes trading that
          stuff between strangers feel safe.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[10px] border border-line bg-card p-6">
          <h2 className="text-[17px] font-semibold">How the money works</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            Payment is held by {BRAND.name} the moment a buyer checks out, and
            only released to the seller once the buyer confirms the item
            arrived — minus a {BRAND.feePercent}% fee. Full detail on{" "}
            <Link href="/trust" className="text-trust hover:underline">
              Trust &amp; Safety
            </Link>
            .
          </p>
        </div>

        <div className="rounded-[10px] border border-line bg-card p-6">
          <h2 className="text-[17px] font-semibold">Questions</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            See{" "}
            <Link href="/contact" className="text-trust hover:underline">
              Contact
            </Link>{" "}
            for the fastest way to reach us, or email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="text-trust hover:underline">
              {BRAND.supportEmail}
            </a>{" "}
            directly.
          </p>
        </div>
      </div>
    </div>
  );
}
