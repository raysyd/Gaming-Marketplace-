import Link from "next/link";
import { queryListings } from "@/lib/data";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { ProductCard } from "@/components/ProductCard";
import { ProductArt } from "@/components/ProductArt";
import { ProductImage } from "@/components/ProductImage";
import { SpecStrip, FpsBar } from "@/components/SpecStrip";
import { artKindFor } from "@/lib/taxonomy";
import type { Category } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const [deals, watched, fresh, prebuilts] = await Promise.all([
    queryListings({ dealsOnly: true, sort: "save", perPage: 6 }),
    queryListings({ sort: "watched", perPage: 6 }),
    queryListings({ sort: "new", perPage: 8 }),
    queryListings({ sub: "gaming-pcs", sort: "new", perPage: 1 }),
  ]);

  const hero = deals.items[0] ?? fresh.items[0];

  return (
    <>
      <section className="border-b border-line bg-card">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div className="rise">
            <p className="eyebrow">Peer to peer · {BRAND.regionLabel}</p>
            <h1 className="display mt-3 text-[clamp(38px,6vw,64px)]">
              Somebody already
              <br />
              built your next PC.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              {BRAND.name} is where Australian gamers sell the rig, card or board
              they just upgraded out of. You pay through us, we hold the money
              until the box lands on your doorstep.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="rounded-md bg-ink px-6 py-3 text-[14px] font-semibold text-white transition hover:bg-chrome-2"
              >
                Shop listings
              </Link>
              <Link
                href="/pc-finder"
                className="rounded-md border border-ink/20 px-6 py-3 text-[14px] font-semibold transition hover:border-ink/50"
              >
                Take the PC Finder quiz
              </Link>
            </div>
            <ul className="mt-7 grid max-w-md grid-cols-3 gap-3 border-t border-line pt-5">
              {[
                ["Escrow", "Held till delivered"],
                ["Fee", `${BRAND.feePercent}% on sale`],
                ["Listing", "Free, always"],
              ].map(([k, v]) => (
                <li key={k}>
                  <div className="eyebrow">{k}</div>
                  <div className="mt-1 text-[13px] font-semibold">{v}</div>
                </li>
              ))}
            </ul>
          </div>

          {hero && (
            <Link
              href={`/product/${hero.id}/${hero.slug}`}
              className="group rounded-[10px] border border-line bg-paper p-3 transition hover:border-ink/25"
            >
              <div className="overflow-hidden rounded-md bg-ink">
                <ProductImage
                  src={hero.image}
                  alt={hero.title}
                  category={hero.category}
                  seed={hero.id}
                  className="aspect-[4/3] w-full transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-3">
                <p className="eyebrow text-deal">Biggest saving right now</p>
                <h2 className="mt-1 text-[16px] font-semibold leading-snug">
                  {hero.title}
                </h2>
                <div className="mt-3">
                  <SpecStrip specs={hero.specs} max={6} />
                </div>
                {hero.fps1080p && (
                  <div className="mt-4">
                    <FpsBar fps={hero.fps1080p} />
                  </div>
                )}
                <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
                  <div>
                    <div className="display text-[30px]">{money(hero.price)}</div>
                    {hero.compareAt && (
                      <div className="spec text-muted">
                        <span className="line-through">{money(hero.compareAt)}</span>{" "}
                        <span className="font-semibold text-deal">
                          save {money(hero.compareAt - hero.price)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="spec text-muted">{hero.sellerName}</div>
                    <div className="spec font-medium text-good">
                      ★ {hero.sellerRating.toFixed(1)} · {hero.sellerSales} sales
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Category tiles, two levels deep */}
      <section className="mx-auto max-w-[1240px] px-4 py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TAXONOMY.map((top) => (
            <div
              key={top.slug}
              className="rounded-[10px] border border-line bg-card p-3"
            >
              <Link href={`/shop?category=${top.slug}`} className="group block">
                <div className="overflow-hidden rounded bg-ink">
                  <ProductArt
                    category={artKindFor(top.children[0].slug) as Category}
                    seed={top.slug}
                    className="aspect-[16/9] w-full transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <h3 className="mt-2.5 text-[14px] font-semibold">{top.name}</h3>
              </Link>
              <ul className="mt-1.5 space-y-0.5">
                {top.children.slice(0, 4).map((sub) => (
                  <li key={sub.slug}>
                    <Link
                      href={`/shop?category=${top.slug}&sub=${sub.slug}`}
                      className="spec text-muted transition hover:text-trust"
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Rail title="Most watched" href="/shop?sort=watched" items={watched.items} />
      <Rail title="Price drops" href="/shop?deals=1" items={deals.items.slice(1)} />

      {/* PC Finder */}
      <section className="mx-auto mt-12 max-w-[1240px] px-4">
        <div className="flex flex-col items-start gap-5 rounded-[10px] bg-chrome px-6 py-10 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <p className="eyebrow text-white/50">PC Finder</p>
            <h2 className="display mt-2 max-w-lg text-[clamp(22px,3vw,30px)] text-white">
              Don&apos;t know what you need? Three questions.
            </h2>
            <p className="mt-2 max-w-md text-[14px] text-white/65">
              Budget, resolution, what else it has to do. We point you at the
              listings that actually match.
            </p>
          </div>
          <Link
            href="/pc-finder"
            className="shrink-0 rounded-md bg-deal px-6 py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
          >
            Take the quiz
          </Link>
        </div>
      </section>

      {/* Escrow explainer */}
      <section className="mx-auto mt-6 max-w-[1240px] px-4">
        <div className="rounded-[10px] border border-line bg-card px-6 py-10 sm:px-10">
          <p className="eyebrow">Where your money sits</p>
          <h2 className="display mt-2 max-w-lg text-[clamp(24px,3.5vw,34px)]">
            Nobody sends a stranger $2,000 and hopes.
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              ["Buyer pays", `The full amount goes to ${BRAND.name}, not to the seller's account.`],
              ["Seller ships", "Tracking is added to the order. The seller can see the money is waiting."],
              ["We release", `Delivery is confirmed, funds land in the seller's payout account minus ${BRAND.feePercent}%.`],
            ].map(([title, body], i) => (
              <li key={title} className="border-t border-line pt-4">
                <span className="spec text-deal">0{i + 1}</span>
                <h3 className="mt-1 text-[15px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/trust"
            className="mt-6 inline-block text-[13px] font-semibold text-trust"
          >
            Read Trust &amp; Safety →
          </Link>
        </div>
      </section>

      <Rail title="Just listed" href="/shop" items={fresh.items} cols={4} />

      <section className="mx-auto mt-14 max-w-[1240px] px-4">
        <div className="flex flex-col items-start gap-4 rounded-[10px] border border-line bg-card p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display text-[24px]">Sitting on an old card?</h2>
            <p className="mt-1 text-[14px] text-muted">
              Listing costs nothing. You only pay when it sells.
            </p>
          </div>
          <Link
            href="/sell"
            className="rounded-md bg-deal px-6 py-3 text-[14px] font-semibold text-white transition hover:brightness-110"
          >
            List an item
          </Link>
        </div>
      </section>
    </>
  );
}

function Rail({
  title,
  href,
  items,
  cols = 4,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof queryListings>>["items"];
  cols?: number;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1240px] px-4 pt-8">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="display text-[26px]">{title}</h2>
        <Link href={href} className="text-[13px] font-semibold text-trust">
          See all →
        </Link>
      </div>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-${cols === 4 ? "4" : "5"}`}
      >
        {items.slice(0, cols === 4 ? 8 : 5).map((l) => (
          <ProductCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}
