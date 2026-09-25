/**
 * The Sidegrade chip mark for generated PNG icons (favicon, Apple touch
 * icon, PWA icons). Same geometry as components/ui/LogoMark, but with
 * literal colours — ImageResponse can't read CSS custom properties.
 * `padded` insets the mark on a bone tile for the maskable/touch icons
 * that platforms crop into circles or squircles.
 */
export function IconMark({ size, padded = false }: { size: number; padded?: boolean }) {
  const inner = padded ? Math.round(size * 0.62) : size;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: padded ? "#f3efe6" : "transparent",
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 32 32" fill="none">
        {!padded && <rect x="0" y="0" width="32" height="32" rx="7" fill="#f3efe6" />}
        <g stroke="#17150f" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v3M20 2v3M12 27v3M20 27v3M2 12h3M2 20h3M27 12h3M27 20h3" />
        </g>
        <rect x="5" y="5" width="22" height="22" rx="5.5" fill="#17150f" />
        <path d="M9.5 13h12M18.5 10l3 3-3 3" stroke="#ff5b1f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22.5 19h-12M13.5 16l-3 3 3 3" stroke="#f3efe6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
