import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { CompanyNav } from "@/components/CompanyNav";

export const metadata = { title: `About — ${BRAND.name}` };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-14">
      <CompanyNav active="/about" />

      <p className="eyebrow mt-8">About</p>
      <h1 className="display mt-2 text-[32px]">{BRAND.tagline}</h1>
      <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">{BRAND.blurb}</p>

      <div className="mt-10 space-y-8">
        <section className="border-t border-line pt-6">
          <h2 className="text-[17px] font-semibold">No warehouse, no stock</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
            {BRAND.name} doesn&apos;t hold inventory. Every listing is a real
            seller&apos;s own hardware — the box they upgraded out of, the parts
            left over from a build. We&apos;re the layer that makes trading that
            stuff between strangers feel safe.
          </p>
        </section>

        <section className="border-t border-line pt-6">
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
        </section>

        <section className="border-t border-line pt-6">
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
        </section>
      </div>
    </div>
  );
}
