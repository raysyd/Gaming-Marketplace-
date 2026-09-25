import Link from "next/link";
import { listBuilds } from "@/lib/builds-data";
import { timeAgo } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { connection } from "next/server";


export default async function BuildsPage() {
  // Rendered per request, from data that's cached and invalidated by tag
  // (see lib/data.ts). Timed ISR here meant the first visitor after any
  // change got the previous copy — the "only a hard refresh shows it" bug.
  await connection();
  const builds = await listBuilds();

  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="display mt-2 text-3xl">Build showcase</h1>
          <p className="mt-1 text-sm text-muted">
            Real setups from real Sidegrade members — not for sale, just for showing off.
          </p>
        </div>
        <Link
          href="/builds/new"
          className="btn btn-primary"
        >
          Post your build
        </Link>
      </div>

      {builds.length === 0 ? (
        <p className="mt-10 text-sm text-muted">No builds posted yet — be the first.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <Link
              key={b.id}
              href={`/builds/${b.id}`}
              className="card-hover overflow-hidden rounded-card border border-line bg-card"
            >
              <div className="h-40 w-full overflow-hidden bg-ink">
                <ProductImage src={b.photos[0] ?? ""} alt={b.title} category="Prebuilt PCs" seed={b.id} className="h-full w-full" showStockBadge={false} />
              </div>
              <div className="p-4">
                <p className="line-clamp-1 text-sm font-semibold">{b.title}</p>
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
