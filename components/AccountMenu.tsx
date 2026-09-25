"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Icon, type IconName } from "./ui/Icon";

export function AccountMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (loading)
    return <span className="block h-9 w-9 rounded-full skeleton" aria-hidden="true" />;

  if (!user)
    return (
      <Link
        href="/login"
        className="btn btn-outline btn-sm"
      >
        <Icon name="user" size={16} />
        <span className="hidden sm:inline">Sign in</span>
        <span className="sr-only sm:hidden">Sign in</span>
      </Link>
    );

  const closeMenu = () => setOpen(false);
  const initial = (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
        onClick={() => setOpen((v) => !v)}
        className={`grid h-9 w-9 place-items-center rounded-full bg-ink text-[14px] font-bold text-paper ring-offset-2 ring-offset-paper transition hover:ring-2 hover:ring-signal ${open ? "ring-2 ring-signal" : ""}`}
      >
        {initial}
      </button>

      {open && (
        <div className="menu-pop absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] overflow-hidden rounded-[14px] border border-line bg-card shadow-[var(--shadow-lg)]" role="menu">
          <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[14px] font-bold text-paper">{initial}</span>
            <p className="truncate text-[13px] text-muted">{user.email}</p>
          </div>

          <div className="p-1.5">
            <p className="eyebrow px-2.5 pb-1 pt-2">Buying</p>
            {(
              [
                ["Orders", "/buying", "package"],
                ["Saved items", "/wishlist", "heart"],
                ["Messages", "/messages", "chat"],
                ["Offers made", "/messages", "tag"],
              ] as const
            ).map(([label, href, icon]) => (
              <MenuLink key={label} href={href} icon={icon} onClick={closeMenu}>{label}</MenuLink>
            ))}

            <p className="eyebrow mt-1 border-t border-line px-2.5 pb-1 pt-3">Selling</p>
            {(
              [
                ["Listings", "/selling", "list"],
                ["Sales", "/selling?tab=to-post", "store"],
                ["Payouts", "/selling#payouts", "wallet"],
                ["Offers received", "/messages", "handshake"],
              ] as const
            ).map(([label, href, icon]) => (
              <MenuLink key={label} href={href} icon={icon} onClick={closeMenu}>{label}</MenuLink>
            ))}
            <MenuLink href="/sell" icon="plus" onClick={closeMenu} accent>List an item</MenuLink>
          </div>

          <div className="border-t border-line p-1.5">
            <MenuLink href="/account" icon="settings" onClick={closeMenu}>Profile &amp; settings</MenuLink>
            <MenuLink href="/account/security" icon="key" onClick={closeMenu}>Security (2FA)</MenuLink>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                role="menuitem"
                onClick={closeMenu}
                className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] text-ink transition hover:bg-paper"
              >
                <Icon name="logout" size={16} className="text-muted" />
                Sign out
              </button>
            </form>
            <MenuLink href="/account/delete" icon="trash" onClick={closeMenu} danger>Delete account</MenuLink>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  onClick,
  children,
  accent,
  danger,
}: {
  href: string;
  icon: IconName;
  onClick: () => void;
  children: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      role="menuitem"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] transition hover:bg-paper ${
        accent ? "font-semibold text-deal" : danger ? "text-danger" : "text-ink"
      }`}
    >
      <Icon name={icon} size={16} className={accent || danger ? "" : "text-muted"} />
      {children}
    </Link>
  );
}
