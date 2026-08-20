import Link from "next/link";
import { queryListings, countBySub, PER_PAGE } from "@/lib/data";
import { findSub, findTop } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { FilterRail } from "@/components/FilterRail";
import { Pagination } from "@/components/Pagination";
import { MobileFilters } from "@/components/MobileFilters";
import { DemoBanner } from "@/components/DemoBanner";
import type { ListingQuery } from "@/lib/types";
import { attrsFromSearchParams } from "@/lib/attributes";

export const revalidate = 60;

type SP = Record<string, string | undefined>;

const SORTS: [string, string][] = [
  ["new", "Newest"],
  ["low", "Price: low to high"],
  ["high", "Price: high to low"],
  ["watched", "Most watched"],
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

  const query: ListingQuery = {
    q: sp.q,
    category: sp.category,
    sub: sp.sub,
    conditions: sp.condition?.split(",").filter(Boolean),
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
    freeShipping: sp.free === "1",
    verifiedOnly: sp.verified === "1",
    dealsOnly: sp.deals === "1",
    status: sp.status === "sold" ? "sold" : undefined,
    attrs: attrsFromSearchParams(sp.sub, sp),
    sort: (sp.sort as ListingQuery["sort"]) ?? "new",
    page: sp.page ? Number(sp.page) : 1,
    perPage: PER_PAGE,
  };

  const [{ items, total, page, pages, isDemo }, counts] = await Promise.all([
    queryListings(query),
    countBySub(),
  ]);

  const heading = sp.q
    ? `Results for “${sp.q}”`
    : findSub(sp.sub ?? "")?.name ??
      findTop(sp.category ?? "")?.name ??
      (sp.deals === "1" ? "Price drops" : sp.status === "sold" ? "Recently sold" : "All listings");

  const activeFilterCount =
    [
      sp.category, sp.sub, sp.condition, sp.min, sp.max,
      sp.free, sp.verified, sp.deals, sp.status,
    ].filter(Boolean).length +
    Object.keys(sp).filter((k) => k.startsWith("attr_") && sp[k]).length;

  const hrefWith = (patch: SP) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      {isDemo && <DemoBanner />}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="spec text-muted">
            <Link href="/shop" className="hover:text-ink">
              Marketplace
            </Link>
            {sp.category && (
              <>
                {" / "}
                <Link href={hrefWith({ sub: undefined, page: undefined })} className="hover:text-ink">
                  {findTop(sp.category)?.name}
                </Link>
              </>
            )}
            {sp.sub && <> / {findSub(sp.sub)?.name}</>}
          </nav>
          <h1 className="display mt-1.5 text-[30px]">{heading}</h1>
          <p className="spec mt-1 text-muted">
            {total.toLocaleString()} {total === 1 ? "listing" : "listings"}
            {pages > 1 && ` · page ${page} of ${pages}`}
          </p>
        </div>

        <div className="no-scrollbar -mx-4 flex w-screen gap-1 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:overflow-visible">
          {SORTS.map(([v, label]) => (
            <Link
              key={v}
              href={hrefWith({ sort: v, page: undefined })}
              className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 text-[12.5px] transition ${
                (sp.sort ?? "new") === v
                  ? "bg-ink font-semibold text-white"
                  : "border border-line hover:border-ink/40"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <MobileFilters activeCount={activeFilterCount}>
        <FilterRail sp={sp} counts={counts} />
      </MobileFilters>

      <div className="mt-4 grid gap-6 lg:mt-0 lg:grid-cols-[236px_1fr]">
        <div className="hidden lg:block">
          <FilterRail sp={sp} counts={counts} />
        </div>

        <div>
          {items.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-line bg-card p-12 text-center">
              <h2 className="display text-[20px]">Nothing matches those filters</h2>
              <p className="mt-2 text-[14px] text-muted">
                Widen the price band or clear a category to see more.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
              <Pagination
                page={page}
                pages={pages}
                makeHref={(p) => hrefWith({ page: p === 1 ? undefined : String(p) })}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
