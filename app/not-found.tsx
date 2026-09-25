import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UnpluggedArt } from "@/components/ui/Illustrations";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center px-4 py-20 text-center">
      <UnpluggedArt className="w-[190px]" />
      <p className="tag-label mt-6 text-muted">Error 404</p>
      <h1 className="display mt-3 text-[clamp(32px,4.4vw,48px)]">That listing is gone</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        It sold, or the seller took it down. There&apos;s plenty more on the bench.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link href="/shop" className="btn btn-primary">
          Browse listings
          <Icon name="arrow-right" size={16} strokeWidth={2.4} className="btn-arrow" />
        </Link>
        <Link href="/" className="btn btn-outline">Go home</Link>
      </div>
    </div>
  );
}
