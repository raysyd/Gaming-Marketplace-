"use client";
import { useState } from "react";
import { useWishlist } from "./WishlistProvider";
import { useToast } from "./ui/Toast";

export function WishlistButton({
  id,
  className = "",
  size = "sm",
}: {
  id: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const on = has(id);
  // Re-keyed on every save so the little "pop" replays each time.
  const [burst, setBurst] = useState(0);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
        if (!on) {
          setBurst((b) => b + 1);
          toast("Saved — we'll flag any price drop.", { tone: "good", action: { label: "View saved", href: "/wishlist" } });
        }
      }}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={`wish-btn ${size === "md" ? "wish-btn-md" : ""} ${on ? "is-on" : ""} ${className}`}
    >
      <svg key={burst} viewBox="0 0 24 24" className={burst ? "wish-pop" : ""} aria-hidden="true">
        <path
          d="M12 20s-7.5-4.5-9.2-9.1A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 9.2 4.1C19.5 15.5 12 20 12 20Z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
