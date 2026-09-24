import Link from "next/link";
import { TAXONOMY, findSub, findTop } from "@/lib/taxonomy";
import { BRAND } from "@/lib/brand";
import { money } from "@/lib/format";
import { attributesFor, attrParam } from "@/lib/attributes";
import { AU_STATES } from "@/lib/au-states";
import s from "./FilterRail.module.css";

const CONDITIONS = ["New", "Like new", "Used", "For parts"];
const PRICE_BANDS: [string, number | undefined, number | undefined][] = [
  ["Under $300", undefined, 300],
  ["$300–$800", 300, 800],
  ["$800–$1.5k", 800, 1500],
  ["$1.5k–$3k", 1500, 3000],
  ["$3k+", 3000, undefined],
];

type SP = Record<string, string | undefined>;

/**
 * Shop filter sidebar. Structure borrowed from Jawa, styled our way:
 *   - no category picked: a "Product category" tree, then collapsible filters
 *   - inside a category: "‹ All categories", a search box scoped to that
 *     category, "Filter by" chips (each removable) + Clear all, then the
 *     category's sub-categories, price and the category-specific filters.
 * Filters are still plain links/GET forms, never client state, so every
 * filtered view has its own shareable, back-button-correct URL.
 */
export function FilterRail({ sp, counts }: { sp: SP; counts: Record<string, number> }) {
  const href = (patch: SP) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) next.set(k, v);
    next.delete("page");
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  // Attribute filters only mean something within the sub-category they were
  // set under, so any category change drops them (see lib/attributes.ts).
  const clearedAttrs = Object.fromEntries(
    Object.keys(sp).filter((k) => k.startsWith("attr_")).map((k) => [k, undefined])
  );
  const navHref = (patch: SP) => href({ ...clearedAttrs, ...patch });

  const activeConds = (sp.condition ?? "").split(",").filter(Boolean);
  const toggleCond = (c: string) => {
    const next = activeConds.includes(c) ? activeConds.filter((x) => x !== c) : [...activeConds, c];
    return href({ condition: next.join(",") || undefined });
  };

  const top = findTop(sp.category ?? "") ?? (sp.sub ? findTop(findSub(sp.sub)?.parent ?? "") : undefined);
  const sub = findSub(sp.sub ?? "");
  const inCategory = Boolean(top);
  const attrDefs = sp.sub ? attributesFor(sp.sub).filter((a) => a.filterable) : [];

  // Everything currently applied, as removable chips.
  const chips: { label: string; remove: string }[] = [];
  if (top) chips.push({ label: `Category: ${top.name}`, remove: navHref({ category: undefined, sub: undefined }) });
  if (sub) chips.push({ label: sub.name, remove: navHref({ sub: undefined }) });
  if (sp.q) chips.push({ label: `“${sp.q}”`, remove: href({ q: undefined }) });
  if (sp.min || sp.max)
    chips.push({
      label: sp.min && sp.max ? `${money(+sp.min)}–${money(+sp.max)}` : sp.min ? `Over ${money(+sp.min)}` : `Under ${money(+sp.max!)}`,
      remove: href({ min: undefined, max: undefined }),
    });
  for (const c of activeConds) chips.push({ label: c, remove: toggleCond(c) });
  for (const def of attrDefs) {
    const v = sp[attrParam(def.key)];
    if (v) chips.push({ label: `${def.label}: ${v}`, remove: href({ [attrParam(def.key)]: undefined }) });
  }
  if (sp.state) chips.push({ label: `Ships from ${sp.state}`, remove: href({ state: undefined }) });
  if (sp.verified) chips.push({ label: "Verified sellers", remove: href({ verified: undefined }) });
  if (sp.free) chips.push({ label: "Free shipping", remove: href({ free: undefined }) });
  if (sp.deals) chips.push({ label: "Reduced price", remove: href({ deals: undefined }) });

  // Hidden fields that carry the rest of the current filters through a GET form.
  const carry = (omit: string[]) =>
    Object.entries(sp)
      .filter(([k, v]) => v && !omit.includes(k) && k !== "page")
      .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);

  return (
    <aside className={s.rail} aria-label="Filters" data-sticky-rail>
      {inCategory && (
        <>
          <Link
            href={sub ? navHref({ sub: undefined }) : navHref({ category: undefined, sub: undefined })}
            className={s.back}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            {sub ? top!.name : "All categories"}
          </Link>

          <form action="/shop" method="get" role="search" className={s.search}>
            {carry(["q"])}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input name="q" defaultValue={sp.q ?? ""} placeholder={`Filter ${sub?.name ?? top!.name}`} aria-label={`Filter ${sub?.name ?? top!.name}`} />
          </form>
        </>
      )}

      {chips.length > 0 && (
        <div className={s.filterBy}>
          <div className={s.filterByHead}>
            <span>Filter by</span>
            <Link href="/shop" className={s.clearAll}>Clear all</Link>
          </div>
          <div className={s.chips}>
            {chips.map((c) => (
              <Link key={c.label} href={c.remove} className={s.chip} aria-label={`Remove filter ${c.label}`}>
                {c.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category tree (top level) or this category's sub-categories */}
      {!inCategory ? (
        <Section title="Product category" open>
          <div className={s.tree}>
          {TAXONOMY.map((t) => (
            <div key={t.slug} className={s.treeGroup}>
              <Link href={navHref({ category: t.slug, sub: undefined })} className={s.treeTop}>{t.name}</Link>
              {t.children.map((c) => (
                <Link key={c.slug} href={navHref({ category: t.slug, sub: c.slug })} className={s.treeSub}>
                  <span>{c.name}</span>
                  {counts[c.slug] ? <span className={s.count}>{counts[c.slug]}</span> : null}
                </Link>
              ))}
            </div>
          ))}
          </div>
        </Section>
      ) : (
        <Section title={top!.name} open>
          <Link href={navHref({ category: top!.slug, sub: undefined })} className={`${s.pick} ${!sub ? s.pickOn : ""}`}>
            <span>All {top!.name}</span>
          </Link>
          {top!.children.map((c) => (
            <Link key={c.slug} href={navHref({ category: top!.slug, sub: c.slug })} className={`${s.pick} ${sub?.slug === c.slug ? s.pickOn : ""}`}>
              <span>{c.name}</span>
              {counts[c.slug] ? <span className={s.count}>{counts[c.slug]}</span> : null}
            </Link>
          ))}
        </Section>
      )}

      <Section title="Price" open>
        <form action="/shop" method="get" className={s.price}>
          {carry(["min", "max"])}
          <label className={s.money}>
            <span>$</span>
            <input name="min" type="number" inputMode="numeric" min={0} defaultValue={sp.min ?? ""} placeholder="Min price" aria-label="Minimum price" />
          </label>
          <label className={s.money}>
            <span>$</span>
            <input name="max" type="number" inputMode="numeric" min={0} defaultValue={sp.max ?? ""} placeholder="Max price" aria-label="Maximum price" />
          </label>
          <button type="submit" className={s.apply}>Apply</button>
        </form>
        <div className={s.bands}>
          {PRICE_BANDS.map(([label, min, max]) => {
            const on = (sp.min ?? "") === String(min ?? "") && (sp.max ?? "") === String(max ?? "");
            return (
              <Link
                key={label}
                href={on ? href({ min: undefined, max: undefined }) : href({ min: min ? String(min) : undefined, max: max ? String(max) : undefined })}
                className={`${s.band} ${on ? s.bandOn : ""}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </Section>

      {attrDefs.map((def) => {
        const param = attrParam(def.key);
        return (
          <Section key={def.key} title={def.label} open={Boolean(sp[param])}>
            {def.options?.map((opt) => {
              const on = sp[param] === opt;
              return <Check key={opt} href={href({ [param]: on ? undefined : opt })} on={on}>{opt}</Check>;
            })}
          </Section>
        );
      })}

      <Section title="Condition" open={activeConds.length > 0}>
        {CONDITIONS.map((c) => (
          <Check key={c} href={toggleCond(c)} on={activeConds.includes(c)}>{c}</Check>
        ))}
      </Section>

      <Section title="Ships from" open={Boolean(sp.state)}>
        <div className={s.states}>
          {AU_STATES.map((st) => (
            <Link key={st} href={href({ state: sp.state === st ? undefined : st })} className={`${s.band} ${sp.state === st ? s.bandOn : ""}`}>
              {st}
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Seller & shipping" open={Boolean(sp.verified || sp.free || sp.deals)}>
        <Check href={href({ verified: sp.verified ? undefined : "1" })} on={sp.verified === "1"}>Verified sellers only</Check>
        <Check href={href({ free: sp.free ? undefined : "1" })} on={sp.free === "1"}>Free shipping</Check>
        <Check href={href({ deals: sp.deals ? undefined : "1" })} on={sp.deals === "1"}>Reduced price</Check>
      </Section>

      <p className={s.foot}>
        Prices in {BRAND.currency}. Top of range {money(BRAND.maxFilterPrice)}.
      </p>
    </aside>
  );
}

/** Collapsible filter group: native <details>, so it works with no JS. */
function Section({ title, open, children }: { title: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className={s.section} open={open}>
      <summary className={s.summary}>
        <span>{title}</span>
        <span className={s.plus} aria-hidden="true" />
      </summary>
      <div className={s.body}>{children}</div>
    </details>
  );
}

/** Checkbox-style filter link. */
function Check({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${s.check} ${on ? s.checkOn : ""}`} aria-pressed={on}>
      <span className={s.box} aria-hidden="true">
        {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
      </span>
      {children}
    </Link>
  );
}
