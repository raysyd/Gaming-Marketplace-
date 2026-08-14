"use client";
import { useWishlist } from "./WishlistProvider";

export function WishlistButton({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const on = has(id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={`grid h-7 w-7 place-items-center rounded-full transition ${
        on ? "bg-deal text-white" : "bg-white/92 text-ink hover:bg-white"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M12 21s-7.5-4.6-9.5-9A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
