import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `About — ${BRAND.name}` };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16">
      <p className="eyebrow">About</p>
      <h1 className="display mt-2 text-[32px]">{BRAND.tagline}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{BRAND.blurb}</p>

      <div className="mt-8 space-y-6 text-[14px] leading-relaxed text-ink">
        <p>
          {BRAND.name} doesn&apos;t hold inventory. Every listing is a real
          seller&apos;s own hardware — the box they upgraded out of, the parts
          left over from a build. We&apos;re the layer that makes trading that
          stuff between strangers feel safe: payment is held until the buyer
          confirms delivery, and released to the seller minus a{" "}
          {BRAND.feePercent}% fee.
        </p>
        <p>
          Read more about how that escrow actually works on the{" "}
          <Link href="/trust" className="text-trust hover:underline">
            Trust &amp; Safety
          </Link>{" "}
          page.
        </p>
        <p>
          Questions, feedback, or something broken? Email{" "}
          <a href={`mailto:${BRAND.supportEmail}`} className="text-trust hover:underline">
            {BRAND.supportEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
