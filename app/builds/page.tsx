import Link from "next/link";
import { listBuilds } from "@/lib/builds-data";
import { timeAgo } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";

export const revalidate = 60;

export default async function BuildsPage() {
  const builds = await listBuilds();

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="display mt-2 text-[30px]">Build showcase</h1>
          <p className="mt-1 text-[14px] text-muted">
            Real setups from real Sidegrade members — not for sale, just for showing off.
          </p>
        </div>
        <Link
          href="/builds/new"
          className="btn btn-dark btn-sm"
        >
          Post your build
        </Link>
      </div>

      {builds.length === 0 ? (
        <p className="mt-10 text-[14px] text-muted">No builds posted yet — be the first.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <Link
              key={b.id}
              href={`/builds/${b.id}`}
              className="card-hover overflow-hidden panel"
            >
              <div className="h-40 w-full overflow-hidden bg-ink">
                <ProductImage src={b.photos[0] ?? ""} alt={b.title} category="Prebuilt PCs" seed={b.id} className="h-full w-full" showStockBadge={false} />
              </div>
              <div className="p-4">
                <p className="line-clamp-1 text-[14.5px] font-semibold">{b.title}</p>
                <p className="spec mt-1 text-muted">
                  {b.authorName} · {timeAgo(b.createdAt)}
                </p>
                {b.fpsNotes && <p className="spec mt-1.5 text-trust">{b.fpsNotes}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
