import Link from "next/link";
import { Suspense } from "react";
import { queryListings, countBySub, PER_PAGE } from "@/lib/data";
import { findSub, findTop } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { FilterRail } from "@/components/FilterRail";
import { Pagination } from "@/components/Pagination";
import { MobileFilters } from "@/components/MobileFilters";
import { DemoBanner } from "@/components/DemoBanner";
import { SaveSearchButton } from "@/components/SaveSearchButton";
import { EmptyState } from "@/components/ui/EmptyState";
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
    state: sp.state,
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
      sp.free, sp.verified, sp.deals, sp.status, sp.state,
    ].filter(Boolean).length +
    Object.keys(sp).filter((k) => k.startsWith("attr_") && sp[k]).length;

  const hrefWith = (patch: SP) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const crumbs: [string, string?][] = [["Marketplace", sp.category || sp.sub || sp.q ? "/shop" : undefined]];
  if (sp.category) crumbs.push([findTop(sp.category)?.name ?? sp.category, sp.sub ? hrefWith({ sub: undefined, page: undefined }) : undefined]);
  if (sp.sub) crumbs.push([findSub(sp.sub)?.name ?? sp.sub]);

  const bigCards =
    sp.category === "full-systems" || ["gaming-pcs", "gaming-laptops", "workstations", "mini-pcs"].includes(sp.sub ?? "");

  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-8 pt-8 lg:px-8 lg:pt-10">
      {isDemo && <DemoBanner />}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
            {crumbs.map(([label, href], i) => (
              <span key={label + i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true" className="text-line-strong">/</span>}
                {href ? (
                  <Link href={href} className="transition hover:text-ink">{label}</Link>
                ) : (
                  <span className="text-ink">{label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="display mt-2 text-[clamp(30px,4vw,46px)]">{heading}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[13.5px] text-muted">
              <span className="font-semibold text-ink tabular-nums">{total.toLocaleString()}</span>{" "}
              {total === 1 ? "listing" : "listings"}
              {pages > 1 && ` · page ${page} of ${pages}`}
            </p>
            {(activeFilterCount > 0 || sp.q) && (
              <Suspense fallback={null}>
                <SaveSearchButton defaultLabel={heading} />
              </Suspense>
            )}
          </div>
        </div>

        <nav aria-label="Sort" className="no-scrollbar -mx-4 flex w-screen items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0">
          <span className="hidden text-[12.5px] text-muted sm:inline">Sort</span>
          <div className="seg w-max shrink-0 !auto-cols-max">
            {SORTS.map(([v, label]) => (
              <Link
                key={v}
                href={hrefWith({ sort: v, page: undefined })}
                aria-current={(sp.sort ?? "new") === v ? "true" : undefined}
                className={`whitespace-nowrap ${(sp.sort ?? "new") === v ? "is-on" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <MobileFilters activeCount={activeFilterCount}>
        <FilterRail sp={sp} counts={counts} />
      </MobileFilters>

      <div className="mt-4 grid gap-8 lg:mt-0 lg:grid-cols-[236px_1fr]">
        <div className="hidden lg:block">
          <FilterRail sp={sp} counts={counts} />
        </div>

        <div>
          {items.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              body="Widen the price band or clear a category to see more. Or save this search and we'll tell you when something lands."
              action={
                <Link href="/shop" className="btn btn-dark">
                  Clear filters
                </Link>
              }
            />
          ) : (
            <>
              {/* Full systems (gaming PCs, laptops, workstations, mini PCs) get 3
                  bigger cards per row so the specs and performance bars have
                  room; everything else stays at 4. */}
              <div
                className={`grid ${
                  bigCards
                    ? "grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4"
                }`}
              >
                {items.map((l, i) => (
                  <div key={l.id} className="rise" style={{ animationDelay: `${Math.min(i, 11) * 35}ms` }}>
                    <ProductCard listing={l} />
                  </div>
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
