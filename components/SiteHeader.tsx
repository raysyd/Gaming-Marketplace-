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
import { MarketTicker } from "./MarketTicker";

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
      <div className="site-nav text-white">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2 px-4 py-3 lg:px-6 sm:gap-3">
          <Link href="/" className="brand-mark shrink-0" aria-label={`${BRAND.name} home`}>
            <span className="brand-word"><i aria-hidden="true">S</i>{BRAND.name.toLowerCase()}</span>
          </Link>

          <div className="nav-search ml-2 hidden flex-1 md:flex">
            <svg className="nav-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search GPUs, prebuilts, monitors…"
              aria-label="Search listings"
              className="h-10 w-full rounded-l-lg bg-transparent pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/45"
            />
            <button
              onClick={search}
              className="h-10 rounded-r-lg bg-deal-strong px-5 text-sm font-semibold text-white transition hover:brightness-110 hover:shadow-[var(--glow-a)]"
            >
              Search
            </button>
          </div>

          <nav className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 text-sm sm:gap-1">
            <Link href="/pc-finder" className="hidden rounded-lg px-2.5 py-2 hover:bg-chrome-2 lg:block">
              PC Finder
            </Link>
            <Link href="/sell" className="hidden rounded-lg px-2.5 py-2 hover:bg-chrome-2 sm:block">
              Sell
            </Link>
            <Link href="/messages" className="hidden rounded-lg px-2.5 py-2 hover:bg-chrome-2 sm:block">
              Messages
            </Link>
            <NotificationBell />
            <Link
              href="/wishlist"
              aria-label="Saved items"
              title="Saved items"
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 hover:bg-chrome-2 sm:px-2.5"
            >
              <span className="text-xl leading-none" aria-hidden="true">♡</span>
              <span className="sr-only">Saved</span>
              {saved > 0 && (
                <span className="spec rounded-full bg-deal-strong px-1.5 py-0.5 font-semibold text-white">
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
                    aria-current={activeCategory === top.slug ? "page" : undefined}
                    className={`nav-tab ${activeCategory === top.slug ? "is-active" : ""}`}
                  >
                    {top.name}
                  </Link>
                  {openMenu === top.slug && (
                    <div className="nav-menu absolute left-0 top-full z-50 hidden min-w-[200px] max-w-[80vw] rounded-b-lg py-1.5 lg:block">
                      {top.children.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/shop?category=${top.slug}&sub=${sub.slug}`}
                          className="block px-4 py-2 text-sm text-ink transition hover:bg-deal-soft hover:text-deal focus-visible:bg-deal-soft"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link href="/shop?deals=1" className="nav-tab nav-tab-hot">
                Price drops
              </Link>
              <Link href="/shop?sort=watched" className="nav-tab">
                Most watched
              </Link>
            </div>
            <div className="flex w-full shrink-0 justify-end border-t border-white/10 py-1 md:ml-auto md:w-auto md:border-l md:border-t-0 md:py-0 md:pl-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <MarketTicker />

      <div className="site-nav border-b border-white/10 px-4 py-2 md:hidden">
        <div className="nav-search flex">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search listings"
            aria-label="Search listings"
            className="h-9 w-full rounded-l-lg bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/45"
          />
          <button
            onClick={search}
            className="h-9 rounded-r-lg bg-deal-strong px-4 text-sm font-semibold text-white"
          >
            Go
          </button>
        </div>
      </div>
    </header>
  );
}
