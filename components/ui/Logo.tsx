import { BRAND } from "@/lib/brand";

/**
 * The Sidegrade mark: a chip (the thing everyone here is swapping) with
 * two arrows passing each other inside it — a sideways trade rather than
 * an upgrade or a downgrade. The arrows slide past each other when the
 * logo is hovered (.logo-link in globals.css).
 *
 * Colours come from the theme tokens, so the chip flips with dark mode
 * without a second asset. app/icon.tsx draws the same geometry for the
 * favicon.
 */
export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`logo-mark shrink-0 ${className}`}
    >
      <g stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v3M20 2v3M12 27v3M20 27v3M2 12h3M2 20h3M27 12h3M27 20h3" />
      </g>
      <rect x="5" y="5" width="22" height="22" rx="5.5" fill="var(--color-ink)" />
      <g strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path className="logo-arrow-a" stroke="var(--color-signal)" d="M9.5 13h12M18.5 10l3 3-3 3" />
        <path className="logo-arrow-b" stroke="var(--color-paper)" d="M22.5 19h-12M13.5 16l-3 3 3 3" />
      </g>
    </svg>
  );
}

export function Logo({ size = 30, tone = "ink" }: { size?: number; tone?: "ink" | "light" }) {
  return (
    <span className={`logo inline-flex items-center gap-2 ${tone === "light" ? "logo-light" : ""}`}>
      <LogoMark size={size} />
      <span className="logo-word display" style={{ fontSize: size * 0.8 }}>
        {BRAND.name}
        <span className="text-signal">.</span>
      </span>
    </span>
  );
}
