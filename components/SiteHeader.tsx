"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { useWishlist } from "./WishlistProvider";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { CartDrawer } from "./CartDrawer";

export function SiteHeader() {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get("category");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll behaviour: the header follows you down the page until the shop's
  // filter sidebar ("‹ All categories") reaches it, then slides away so the
  // sidebar can take the top of the screen. Scrolling up brings it back.
  // Pages without the sidebar use a fixed threshold instead. The current
  // header height is published as --header-offset so sticky things (the
  // sidebar) sit just below it, or at the very top while it's hidden.
  useEffect(() => {
    let lastY = window.scrollY;
    let isHidden = false;
    const apply = (h: boolean) => {
      isHidden = h;
      setHidden(h);
      const height = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--header-offset", h ? "0px" : `${height}px`);
    };
    apply(false);
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) < 4) return;
      const height = headerRef.current?.offsetHeight ?? 0;
      const rail = document.querySelector<HTMLElement>("[data-sticky-rail]");
      // Measure the rail's column, not the rail: once the rail is stuck its
      // own position no longer says where it started on the page.
      const anchor = rail?.parentElement ?? rail;
      const threshold = anchor
        ? anchor.getBoundingClientRect().top + y - height - 16
        : height + 240;
      if (dy > 0 && y > threshold && !isHidden) apply(true);
      else if ((dy < 0 || y <= threshold) && isHidden) apply(false);
      lastY = y;
    };
    const onResize = () => apply(isHidden);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  useEffect(() => {
    if (hidden) setOpenMenu(null);
  }, [hidden]);
  const { count: saved } = useWishlist();

  const search = () =>
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 transition-transform duration-300 ease-out"
      style={{ transform: hidden ? "translateY(-100%)" : undefined }}
    >
      <div className="bg-chrome text-white">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2 px-4 py-3 lg:px-6 sm:gap-3">
          <Link href="/" className="shrink-0">
            <span className="display text-[21px] text-white">{BRAND.name}</span>
            <span className="rgb-text display text-[21px]">.</span>
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
            <NotificationBell />
            <Link
              href="/wishlist"
              aria-label="Saved items"
              title="Saved items"
              className="flex shrink-0 items-center gap-1 rounded px-2 py-2 hover:bg-chrome-2 sm:px-2.5"
            >
              <span className="text-[19px] leading-none" aria-hidden="true">♡</span>
              <span className="sr-only">Saved</span>
              {saved > 0 && (
                <span className="spec rounded-full bg-deal px-1.5 py-0.5 font-semibold text-white">
                  {saved}
                </span>
              )}
            </Link>
            <CartDrawer />
            <div className="ml-1 border-l border-white/15 pl-1 sm:ml-2 sm:pl-2">
              <AccountMenu />
            </div>
          </nav>
        </div>

        {/* Two-level category navigation with hover menus */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1560px] flex-col px-4 md:flex-row lg:px-6 md:items-center">
            <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto md:flex-1">
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
                        : "rgb-underline border-transparent text-white/80 hover:text-white"
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
                className="rgb-underline shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[12.5px] text-white/80 transition hover:text-white"
              >
                Price drops
              </Link>
              <Link
                href="/shop?sort=watched"
                className="rgb-underline shrink-0 whitespace-nowrap border-b-2 border-transparent px-2.5 py-2.5 text-[12.5px] text-white/80 transition hover:text-white"
              >
                Most watched
              </Link>
            </div>
            <div className="flex w-full shrink-0 justify-end border-t border-white/10 bg-chrome py-1 md:ml-auto md:w-auto md:border-l md:border-t-0 md:py-0 md:pl-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-trust-soft">
        <p className="spec mx-auto max-w-[1560px] px-4 py-1.5 lg:px-6 leading-relaxed text-trust">
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
