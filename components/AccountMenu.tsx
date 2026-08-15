"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

export function AccountMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading)
    return <span className="w-[68px] rounded px-2.5 py-2" aria-hidden="true" />;

  if (!user)
    return (
      <Link
        href="/login"
        className="whitespace-nowrap rounded bg-white/10 px-3 py-2 font-semibold transition hover:bg-white/20"
      >
        Sign in
      </Link>
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 transition hover:bg-chrome-2 sm:px-3"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-deal text-[11px] font-bold uppercase text-white">
          {user.email[0]}
        </span>
        <span className="hidden sm:inline">Account</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 min-w-[190px] rounded-md border border-line bg-card py-1.5 shadow-lg">
          <p className="spec truncate border-b border-line px-4 pb-2 text-muted">
            {user.email}
          </p>
          {[
            ["Your shop", "/dashboard"],
            ["Messages", "/messages"],
            ["Saved items", "/wishlist"],
            ["List an item", "/sell"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-2 text-[13px] text-ink transition hover:bg-paper"
            >
              {label}
            </Link>
          ))}
          <form action="/auth/signout" method="post" className="border-t border-line">
            <button
              type="submit"
              className="w-full px-4 py-2 text-left text-[13px] text-ink transition hover:bg-paper"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
