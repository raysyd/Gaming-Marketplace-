"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { TAXONOMY } from "@/lib/taxonomy";
import { useWishlist } from "./WishlistProvider";
import { AccountMenu } from "./AccountMenu";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { CartDrawer } from "./CartDrawer";
import { Logo } from "./ui/Logo";
import { Icon } from "./ui/Icon";
import s from "./SiteHeader.module.css";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeCategory = params.get("category");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Scroll behaviour: the header follows you down the page until the shop's
  // filter sidebar reaches it, then slides away so the sidebar can take the
  // top of the screen. Scrolling up brings it back. Pages without the
  // sidebar use a fixed threshold instead. The current header height is
  // published as --header-offset so sticky things (the sidebar, the cart
  // summary) sit just below it, or at the very top while it's hidden.
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
      setScrolled(y > 8);
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

  // "/" focuses search from anywhere (unless you're already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile menu on navigation and lock page scroll while it's open.
  useEffect(() => setMobileNav(false), [pathname, params]);
  useEffect(() => {
    document.body.style.overflow = mobileNav ? "hidden" : "";
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileNav(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileNav]);

  const { count: saved } = useWishlist();

  const search = () =>
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");

  const isDeals = pathname === "/shop" && params.get("deals") === "1";
  const isWatched = pathname === "/shop" && params.get("sort") === "watched" && !activeCategory;

  return (
    <header
      ref={headerRef}
      className={`${s.header} ${scrolled ? s.scrolled : ""}`}
      style={{ transform: hidden ? "translateY(-100%)" : undefined }}
    >
      <div className={s.bar}>
        <div className="mx-auto flex h-16 max-w-[1480px] items-center gap-2 px-4 sm:gap-3 lg:px-8">
          <button
            type="button"
            className={`${s.iconBtn} -ml-2 grid lg:hidden`}
            aria-label="Open menu"
            aria-expanded={mobileNav}
            onClick={() => setMobileNav(true)}
          >
            <Icon name="menu" size={22} />
          </button>

          <Link href="/" className="logo-link shrink-0" aria-label={`${BRAND.name} home`}>
            <Logo size={28} />
          </Link>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
            className={`${s.search} mx-auto hidden md:flex`}
          >
            <Icon name="search" size={18} className="text-muted" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search GPUs, prebuilts, monitors…"
              aria-label="Search listings"
              className="search-input"
            />
            <kbd className="kbd hidden lg:inline-grid" aria-hidden="true">/</kbd>
          </form>

          <nav className="ml-auto flex shrink-0 items-center gap-0.5 md:ml-0" aria-label="Account">
            <Link href="/pc-finder" className={`${s.textLink} hidden xl:inline-flex`}>
              PC Finder
            </Link>
            <Link href="/messages" className={`${s.iconBtn} hidden sm:grid`} aria-label="Messages" title="Messages">
              <Icon name="chat" size={20} />
            </Link>
            <NotificationBell />
            <Link
              href="/wishlist"
              aria-label={`Saved items${saved ? `, ${saved}` : ""}`}
              title="Saved items"
              className={`${s.iconBtn} hidden sm:grid`}
            >
              <Icon name="heart" size={20} />
              {saved > 0 && <span className={s.dot}>{saved}</span>}
            </Link>
            <CartDrawer />
            <Link href="/sell" className="btn btn-primary btn-sm ml-1.5 hidden sm:inline-flex">
              <Icon name="plus" size={16} strokeWidth={2.4} />
              Sell
            </Link>
            <div className="ml-1">
              <AccountMenu />
            </div>
          </nav>
        </div>

        {/* Category row with hover/focus menus */}
        <div className={s.catRow}>
          <div className="mx-auto flex max-w-[1480px] items-center px-4 lg:px-8">
            <nav className="no-scrollbar -ml-2.5 flex min-w-0 flex-1 gap-0.5 overflow-x-auto" aria-label="Categories">
              {TAXONOMY.map((top) => (
                <div
                  key={top.slug}
                  className="relative shrink-0"
                  onMouseEnter={() => setOpenMenu(top.slug)}
                  onMouseLeave={() => setOpenMenu(null)}
                  onFocus={() => setOpenMenu(top.slug)}
                  onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpenMenu(null)}
                >
                  <Link
                    href={`/shop?category=${top.slug}`}
                    aria-current={activeCategory === top.slug ? "page" : undefined}
                    className={s.cat}
                  >
                    {top.name}
                  </Link>
                  {openMenu === top.slug && (
                    <div className={s.menu}>
                      <p className="eyebrow px-3 pb-1.5 pt-1">{top.name}</p>
                      {top.children.map((sub) => (
                        <Link key={sub.slug} href={`/shop?category=${top.slug}&sub=${sub.slug}`} className={s.menuItem}>
                          {sub.name}
                          <Icon name="arrow-right" size={14} className={s.menuArrow} />
                        </Link>
                      ))}
                      <Link href={`/shop?category=${top.slug}`} className={`${s.menuItem} ${s.menuAll}`}>
                        Everything in {top.name}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              <span className="mx-1.5 my-auto h-4 w-px shrink-0 bg-line-strong" aria-hidden="true" />
              <Link href="/shop?deals=1" className={`${s.cat} ${s.catHot}`} aria-current={isDeals ? "page" : undefined}>
                <Icon name="trending-down" size={15} />
                Price drops
              </Link>
              <Link href="/shop?sort=watched" className={s.cat} aria-current={isWatched ? "page" : undefined}>
                Most watched
              </Link>
              <Link href="/builds" className={s.cat} aria-current={pathname.startsWith("/builds") ? "page" : undefined}>
                Builds
              </Link>
            </nav>
            <Link href="/trust" className={`${s.trustNote} hidden xl:inline-flex`}>
              <Icon name="lock" size={14} />
              Payment held until it arrives
            </Link>
            <ThemeToggle className="ml-2 hidden shrink-0 md:grid" />
          </div>
        </div>

        <div className="border-t border-line px-4 py-2.5 md:hidden">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
            className={`${s.search} ${s.searchMobile}`}
          >
            <Icon name="search" size={18} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings"
              aria-label="Search listings"
              enterKeyHint="search"
              className="search-input"
            />
          </form>
        </div>
      </div>

      {mobileNav && <MobileNav onClose={() => setMobileNav(false)} saved={saved} />}
    </header>
  );
}

function MobileNav({ onClose, saved }: { onClose: () => void; saved: number }) {
  return (
    <div className={s.sheetWrap} role="dialog" aria-modal="true" aria-label="Menu">
      <button type="button" className={s.sheetBackdrop} onClick={onClose} aria-label="Close menu" />
      <div className={s.sheet}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Logo size={26} />
          <button type="button" className={`${s.iconBtn} grid`} onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
          <Link href="/sell" className="btn btn-primary btn-block">
            <Icon name="plus" size={17} strokeWidth={2.4} /> List something for sale
          </Link>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(
              [
                ["Messages", "/messages", "chat"],
                [saved ? `Saved (${saved})` : "Saved", "/wishlist", "heart"],
                ["Orders", "/buying", "package"],
              ] as const
            ).map(([label, href, icon]) => (
              <Link key={href} href={href} className={s.quick}>
                <Icon name={icon} size={20} />
                {label}
              </Link>
            ))}
          </div>

          <p className="eyebrow mt-7">Shop</p>
          <ul className="mt-2">
            {TAXONOMY.map((top) => (
              <li key={top.slug}>
                <details className={s.acc}>
                  <summary>
                    {top.name}
                    <Icon name="chevron-down" size={16} />
                  </summary>
                  <div className="pb-2 pl-3">
                    <Link href={`/shop?category=${top.slug}`} className={s.accLink}>All {top.name}</Link>
                    {top.children.map((sub) => (
                      <Link key={sub.slug} href={`/shop?category=${top.slug}&sub=${sub.slug}`} className={s.accLink}>
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <p className="eyebrow mt-7">More</p>
          <ul className="mt-2 grid gap-0.5">
            {[
              ["Price drops", "/shop?deals=1"],
              ["Most watched", "/shop?sort=watched"],
              ["PC Finder quiz", "/pc-finder"],
              ["Build showcase", "/builds"],
              ["Your shop", "/selling"],
              ["Trust & safety", "/trust"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link href={href} className={s.accLink}>{label}</Link>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex items-center justify-between rounded-[12px] border border-line bg-paper px-4 py-3">
            <span className="text-[14px] font-medium">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
