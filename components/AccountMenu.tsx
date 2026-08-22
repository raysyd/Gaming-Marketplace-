"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function AccountMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading)
    return <span className="h-9 w-9 rounded px-2.5 py-2" aria-hidden="true" />;

  if (!user)
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        title="Sign in"
        className="grid h-9 w-9 place-items-center rounded bg-white/10 text-[18px] transition hover:bg-white/20"
      >
        <UserIcon />
        <span className="sr-only">Sign in</span>
      </Link>
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Open account menu"
        title="Account"
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded transition hover:bg-chrome-2"
      >
        <UserIcon />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 min-w-[190px] rounded-md border border-line bg-card py-1.5 shadow-lg">
          <p className="spec truncate border-b border-line px-4 pb-2 text-muted">
            {user.email}
          </p>

          <p className="eyebrow px-4 pb-1 pt-2.5 text-muted">Buying</p>
          {[
            ["Orders", "/buying"],
            ["Saved items", "/wishlist"],
            ["Messages", "/messages"],
            ["Offers made", "/messages"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="block px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
            >
              {label}
            </Link>
          ))}

          <p className="eyebrow border-t border-line px-4 pb-1 pt-2.5 text-muted">Selling</p>
          {[
            ["Listings", "/selling"],
            ["Sales", "/selling?tab=to-post"],
            ["Payouts", "/selling#payouts"],
            ["Offers received", "/messages"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="block px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
            >
              {label}
            </Link>
          ))}

          <Link
            href="/sell"
            className="block border-t border-line px-4 py-2 text-[13px] font-semibold text-trust transition hover:bg-paper"
          >
            List an item
          </Link>

          <Link
            href="/account"
            className="block border-t border-line px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Profile & settings
          </Link>

          <Link
            href="/account/security"
            className="block px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Security (2FA)
          </Link>

          <form action="/auth/signout" method="post" className="border-t border-line">
            <button
              type="submit"
              className="w-full px-4 py-2 text-left text-[13px] text-ink transition hover:bg-paper"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/account/delete"
            className="block px-4 py-2 text-[13px] text-deal transition hover:bg-paper"
          >
            Delete account
          </Link>
        </div>
      )}
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-current"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-3.3 3-5.2 6.5-5.2s5.9 1.9 6.5 5.2H5.5Z" />
    </svg>
  );
}
