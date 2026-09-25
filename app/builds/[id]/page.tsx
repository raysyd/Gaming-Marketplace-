import { notFound } from "next/navigation";
import Link from "next/link";
import { getBuild } from "@/lib/builds-data";
import { timeAgo } from "@/lib/format";
import { ProductImage } from "@/components/ProductImage";
import { BuildActions } from "@/components/BuildActions";

export const revalidate = 60;

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const build = await getBuild(id);
  if (!build) notFound();

  return (
    <div className="mx-auto max-w-[860px] px-4 py-10">
      <Link href="/builds" className="spec text-trust hover:underline">
        ← Build showcase
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-[clamp(30px,4vw,42px)]">{build.title}</h1>
          <p className="spec mt-1 text-muted">
            {build.authorName} · {timeAgo(build.createdAt)}
          </p>
        </div>
        <BuildActions id={build.id} ownerId={build.userId} />
      </div>

      {build.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {build.photos.map((src, i) => (
            <div key={src + i} className="aspect-[4/3] overflow-hidden rounded-[10px] border border-line bg-ink">
              <ProductImage src={src} alt={build.title} category="Prebuilt PCs" seed={build.id + i} className="h-full w-full" showStockBadge={false} />
            </div>
          ))}
        </div>
      )}

      {build.fpsNotes && (
        <p className="spec mt-6 rounded-md border border-trust bg-trust/5 px-3 py-2 text-trust">
          {build.fpsNotes}
        </p>
      )}

      {build.description && (
        <p className="mt-6 max-w-2xl text-[14.5px] leading-relaxed">{build.description}</p>
      )}

      {build.specs.length > 0 && (
        <dl className="mt-6 overflow-hidden panel">
          {build.specs.map((s, i) => (
            <div key={s.label} className={`flex justify-between px-4 py-2.5 ${i % 2 ? "bg-paper" : ""}`}>
              <dt className="spec text-muted">{s.label}</dt>
              <dd className="spec font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
