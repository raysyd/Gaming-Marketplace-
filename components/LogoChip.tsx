/** The logo glyph: a processor die with pins, lit purple → cyan, with the
 * "S" traced on the die. `id` keeps the gradient id unique per use. */
export function LogoChip({ id = "chip", size = 26 }: { id?: string; size?: number }) {
  const g = `${id}-g`;
  return (
    <svg className="brand-chip" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${g})`} strokeWidth="2" strokeLinecap="round">
        <path d="M11 3v4M16 3v4M21 3v4M11 25v4M16 25v4M21 25v4M3 11h4M3 16h4M3 21h4M25 11h4M25 16h4M25 21h4" />
      </g>
      <rect x="7" y="7" width="18" height="18" rx="3" fill="#0b0e14" stroke={`url(#${g})`} strokeWidth="2" />
      <path
        d="M12.5 19.5c1 1 2.2 1.5 3.6 1.5 2 0 3.4-1 3.4-2.6 0-3.4-7-1.9-7-5.2 0-1.5 1.3-2.7 3.3-2.7 1.3 0 2.4.4 3.2 1.2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
