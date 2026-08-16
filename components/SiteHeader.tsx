"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { count } = useCart();
  const { count: saved } = useWishlist();

  const search = () =>
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-chrome text-white">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-4 py-3 sm:gap-3">
          <Link href="/" className="shrink-0">
            <span className="display text-[21px] text-white">{BRAND.name}</span>
            <span className="display text-[21px] text-deal">.</span>
          </Link>

          <div className="ml-2 hidden flex-1 md:flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search GPUs, prebuilts, monitors…"
              aria-label="Search listings"
              className="search-input h-10 w-full rounded-l-md px-3 text-[14px] text-ink"
            />
            <button
              onClick={search}
              className="h-10 rounded-r-md bg-deal px-5 text-[13px] font-semibold text-white transition hover:brightness-110"
            >
              Search
            </button>
          </div>

          <nav className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 text-[13px] sm:gap-1">
            <Link href="/pc-finder" className="hidden rounded px-2.5 py-2 hover:bg-chrome-2 lg:block">
              PC Finder
            </Link>
            <Link href="/sell" className="hidden rounded px-2.5 py-2 hover:bg-chrome-2 sm:block">
              Sell
            </Link>
            <Link href="/messages" className="hidden rounded px-2.5 py-2 hover:bg-chrome-2 sm:block">
              Messages
            </Link>
            <Link
              href="/wishlist"
              className="flex shrink-0 items-center gap-1 rounded px-2 py-2 hover:bg-chrome-2 sm:px-2.5"
            >
              <span className="hidden sm:inline">Saved</span>
              <span className="sm:hidden" aria-label="Saved items">♥</span>
              {saved > 0 && (
                <span className="spec rounded-full bg-deal px-1.5 py-0.5 font-semibold text-white">
                  {saved}
                </span>
              )}
            </Link>
            <Link
              href="/cart"
              className="ml-0.5 flex shrink-0 items-center gap-1.5 rounded bg-chrome-2 px-2.5 py-2 sm:ml-1 sm:px-3"
            >
              <span className="hidden sm:inline">Cart</span>
              <span className="sm:hidden" aria-label="Cart">🛒</span>
              <span className="spec rounded-full bg-deal px-1.5 py-0.5 font-semibold text-white">
                {count}
              </span>
            </Link>
            <div className="ml-1 border-l border-white/15 pl-1 sm:ml-2 sm:pl-2">
              <AccountMenu />
            </div>
          </nav>
        </div>

        {/* Two-level category navigation with hover menus */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1240px] items-center px-4">
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto">
              {TAXONOMY.map((top) => (
                <div
                  key={top.slug}
                    className="relative shrink-0"
                  onMouseEnter={() => setOpenMenu(top.slug)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <Link
                    href={`/shop?category=${top.slug}`}
                    className={`block shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-[12.5px] transition ${
                      activeCategory === top.slug
                        ? "border-deal text-deal"
                        : "border-transparent text-white/80 hover:text-deal"
                    }`}
                  >
                    {top.name}
                  </Link>
                  {openMenu === top.slug && (
                    <div className="absolute left-0 top-full z-50 hidden min-w-[200px] max-w-[80vw] rounded-b-md border border-line bg-card py-1.5 shadow-lg lg:block">
                      {top.children.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/shop?category=${top.slug}&sub=${sub.slug}`}
                          className="block px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link
                href="/shop?deals=1"
                className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[12.5px] font-semibold text-deal"
              >
                Price drops
              </Link>
              <Link
                href="/shop?sort=watched"
                className="shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[12.5px] text-white/80 hover:text-deal"
              >
                Most watched
              </Link>
            </div>
            <div className="ml-auto shrink-0 border-l border-white/10 bg-chrome pl-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-trust-soft">
        <p className="spec mx-auto max-w-[1240px] px-4 py-1.5 leading-relaxed text-trust">
          Payment is held until you confirm the item arrived ·{" "}
          <Link href="/trust" className="underline">
            How it works
          </Link>{" "}
          · Ships anywhere in {BRAND.regionLabel}
        </p>
      </div>

      <div className="border-b border-line bg-card px-4 py-2 md:hidden">
        <div className="flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search listings"
            aria-label="Search listings"
            className="search-input h-9 w-full rounded-l-md px-3 text-[14px]"
          />
          <button
            onClick={search}
            className="h-9 rounded-r-md bg-ink px-4 text-[13px] font-semibold text-white"
          >
            Go
          </button>
        </div>
      </div>
    </header>
  );
}
