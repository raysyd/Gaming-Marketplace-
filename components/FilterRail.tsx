import Link from "next/link";
import { TAXONOMY } from "@/lib/taxonomy";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { attributesFor, attrParam } from "@/lib/attributes";

const CONDITIONS = ["New", "Like new", "Used", "For parts"];
const PRICE_BANDS: [string, number | undefined, number | undefined][] = [
  ["Under $300", undefined, 300],
  ["$300 – $800", 300, 800],
  ["$800 – $1,500", 800, 1500],
  ["$1,500 – $3,000", 1500, 3000],
  ["$3,000+", 3000, undefined],
];

type SP = Record<string, string | undefined>;

/**
 * Filters are links, not client state. Every filtered view has its own URL, so
 * it's shareable, back-button-correct, and cacheable at the edge.
 */
export function FilterRail({
  sp,
  counts,
}: {
  sp: SP;
  counts: Record<string, number>;
}) {
  const href = (patch: SP) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch }))
      if (v) next.set(k, v);
    next.delete("page");
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const activeConds = (sp.condition ?? "").split(",").filter(Boolean);
  const toggleCond = (c: string) => {
    const next = activeConds.includes(c)
      ? activeConds.filter((x) => x !== c)
      : [...activeConds, c];
    return href({ condition: next.join(",") || undefined });
  };

  // Any attribute filter (attr_type, attr_capacity, …) is only meaningful
  // for the subcategory it was set under — carrying it across a category
  // change would silently filter the new subcategory against a value that
  // was never one of its options, producing an empty result with no
  // visible reason. Clear all of it whenever category/sub changes.
  const clearedAttrs = Object.fromEntries(
    Object.keys(sp)
      .filter((k) => k.startsWith("attr_"))
      .map((k) => [k, undefined])
  );
  const navHref = (patch: SP) => href({ ...clearedAttrs, ...patch });

  const attrDefs = sp.sub ? attributesFor(sp.sub).filter((a) => a.filterable) : [];

  return (
    <aside className="h-fit rounded-[10px] border border-line bg-card p-4">
      <Block title="Category">
        <Row href={navHref({ category: undefined, sub: undefined })} on={!sp.category && !sp.sub}>
          All listings
        </Row>
        {TAXONOMY.map((top) => (
          <div key={top.slug} className="mt-2">
            <Row
              href={navHref({ category: top.slug, sub: undefined })}
              on={sp.category === top.slug && !sp.sub}
              bold
            >
              {top.name}
            </Row>
            <div className="ml-2 border-l border-line pl-2">
              {top.children.map((sub) => (
                <Row
                  key={sub.slug}
                  href={navHref({ category: top.slug, sub: sub.slug })}
                  on={sp.sub === sub.slug}
                >
                  <span className="flex justify-between gap-2">
                    {sub.name}
                    {counts[sub.slug] ? (
                      <span className="spec text-muted">{counts[sub.slug]}</span>
                    ) : null}
                  </span>
                </Row>
              ))}
            </div>
          </div>
        ))}
      </Block>

      {attrDefs.map((def) => (
        <Block key={def.key} title={def.label}>
          {def.options?.map((opt) => {
            const param = attrParam(def.key);
            const on = sp[param] === opt;
            return (
              <Row key={opt} href={href({ [param]: on ? undefined : opt })} on={on}>
                {opt}
              </Row>
            );
          })}
        </Block>
      ))}

      <Block title="Price">
        {PRICE_BANDS.map(([label, min, max]) => {
          const on = sp.min === String(min ?? "") && sp.max === String(max ?? "");
          return (
            <Row
              key={label}
              href={href({ min: min ? String(min) : undefined, max: max ? String(max) : undefined })}
              on={on}
            >
              {label}
            </Row>
          );
        })}
        {(sp.min || sp.max) && (
          <Row href={href({ min: undefined, max: undefined })} on={false}>
            <span className="text-muted">Clear price</span>
          </Row>
        )}
      </Block>

      <Block title="Condition">
        {CONDITIONS.map((c) => (
          <Row key={c} href={toggleCond(c)} on={activeConds.includes(c)}>
            {c}
          </Row>
        ))}
      </Block>

      <Block title="Seller & shipping">
        <Row href={href({ verified: sp.verified ? undefined : "1" })} on={sp.verified === "1"}>
          Verified sellers only
        </Row>
        <Row href={href({ free: sp.free ? undefined : "1" })} on={sp.free === "1"}>
          Free shipping
        </Row>
        <Row href={href({ deals: sp.deals ? undefined : "1" })} on={sp.deals === "1"}>
          Reduced price
        </Row>
      </Block>

      <Link
        href="/shop"
        className="mt-2 block rounded border border-line py-2 text-center text-[13px] font-medium transition hover:border-ink/40"
      >
        Clear all filters
      </Link>

      <p className="spec mt-4 border-t border-line pt-3 text-muted">
        Prices in {BRAND.currency}. Top of range {money(BRAND.maxFilterPrice)}.
      </p>
    </aside>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b border-line pb-4 last:border-0">
      <h3 className="eyebrow mb-2">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  href,
  on,
  bold,
  children,
}: {
  href: string;
  on: boolean;
  bold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`block rounded px-1.5 py-1 text-[13px] transition ${
        on ? "bg-trust-soft font-semibold text-trust" : "hover:bg-paper"
      } ${bold ? "font-semibold" : ""}`}
    >
      {children}
    </Link>
  );
}
