import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-2 text-[30px]">That listing is gone</h1>
      <p className="mt-3 text-[14px] text-muted">
        It sold, or the seller took it down. There&apos;s plenty more.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-block rounded-md bg-ink px-6 py-3 text-[14px] font-semibold text-white"
      >
        Browse listings
      </Link>
    </div>
  );
}
