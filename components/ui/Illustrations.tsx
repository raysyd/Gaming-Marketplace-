/**
 * Small line illustrations drawn for Sidegrade. Same pen everywhere:
 * graphite outline, bone fill, one splash of signal orange. They pick
 * their colours from the theme tokens so they work in dark mode too.
 * Decorative only — every caller provides the meaning in text nearby.
 */
const ink = "var(--color-ink)";
const card = "var(--color-card)";
const soft = "var(--color-paper-2)";
const signal = "var(--color-signal)";
const green = "var(--color-trust)";
const S = { stroke: ink, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

type P = { className?: string };

/** An opened, empty shipping box. Empty cart, empty order tabs. */
export function EmptyBoxArt({ className = "empty-art" }: P) {
  return (
    <svg viewBox="0 0 160 124" className={className} aria-hidden="true" fill="none">
      <ellipse cx="80" cy="112" rx="54" ry="6" fill={soft} />
      <path d="M36 58 80 44l44 14-44 14Z" fill={soft} {...S} />
      <path d="M36 58v38l44 14V72Z" fill={card} {...S} />
      <path d="M124 58v38l-44 14V72Z" fill={card} {...S} />
      <path d="M36 58 17 46l44-14 19 12M124 58l19-12-44-14-19 12" fill={card} {...S} />
      <path d="M92 80.5l20-6.4v9l-20 6.4Z" fill={signal} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M80 12v10M62 17l5 7.5M98 17l-5 7.5" stroke={signal} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** A shelf tag with a heart on it. Empty wishlist. */
export function HeartTagArt({ className = "empty-art" }: P) {
  return (
    <svg viewBox="0 0 160 124" className={className} aria-hidden="true" fill="none">
      <ellipse cx="78" cy="112" rx="50" ry="6" fill={soft} />
      <path d="M121 58c14 0 18-22 30-26" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 5" />
      <path d="M36 30h68l22 30-22 30H36a7 7 0 0 1-7-7V37a7 7 0 0 1 7-7Z" fill={card} {...S} transform="rotate(-6 80 60)" />
      <circle cx="112" cy="56" r="5" fill={soft} {...S} />
      <path d="M68 76s-17-9.6-17-20a8.4 8.4 0 0 1 17-2.6A8.4 8.4 0 0 1 85 56c0 10.4-17 20-17 20Z" fill={signal} {...S} transform="rotate(-6 68 60)" />
      <path d="M40 98h26" stroke={ink} strokeWidth="2.2" strokeLinecap="round" opacity=".25" />
    </svg>
  );
}

/** A plug pulled out of its socket, with sparks. Errors, 404, offline. */
export function UnpluggedArt({ className = "empty-art" }: P) {
  return (
    <svg viewBox="0 0 170 124" className={className} aria-hidden="true" fill="none">
      <ellipse cx="85" cy="112" rx="62" ry="6" fill={soft} />
      <path d="M8 100c10 0 12-14 12-28s2-12 8-12" {...S} />
      <rect x="28" y="48" width="34" height="24" rx="6" fill={card} {...S} />
      <path d="M62 54h11M62 66h11" {...S} strokeWidth="3" />
      <path d="M80 44l4-7M86 60h8M80 76l4 7" stroke={signal} strokeWidth="2.6" strokeLinecap="round" />
      <rect x="100" y="42" width="44" height="36" rx="8" fill={card} {...S} />
      <rect x="110" y="53" width="5" height="12" rx="2" fill={ink} />
      <rect x="129" y="53" width="5" height="12" rx="2" fill={ink} />
      <path d="M144 60c10 0 12 10 12 22s4 18 12 18" {...S} />
    </svg>
  );
}

/** A graphics card wearing a price tag. "Sell your old card" CTA. */
export function GpuTagArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 240 170" className={className} aria-hidden="true" fill="none">
      <ellipse cx="116" cy="152" rx="92" ry="8" fill="rgba(0,0,0,.18)" />
      <path d="M26 58h168a8 8 0 0 1 8 8v58a8 8 0 0 1-8 8H26Z" fill="#f3efe6" stroke="#101814" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M26 50v90M18 58h8M18 132h8" stroke="#101814" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M52 132v10h66v-10" stroke="#101814" strokeWidth="2.4" strokeLinejoin="round" fill="#d4a73a" />
      <path d="M60 136v6M70 136v6M80 136v6M90 136v6M100 136v6M110 136v6" stroke="#101814" strokeWidth="1.6" />
      {[80, 146].map((cx) => (
        <g key={cx} className="gpu-fan" style={{ transformOrigin: `${cx}px 95px` }}>
          <circle cx={cx} cy="95" r="26" fill="#1b2821" stroke="#101814" strokeWidth="2.4" />
          <path d={`M${cx} 95c0-10 5-16 12-17M${cx} 95c9 5 12 12 9 18M${cx} 95c-9 5-17 4-20-2M${cx} 95c-8-6-10-13-6-19`} stroke="#5fd0a0" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={cx} cy="95" r="5" fill="#f3efe6" stroke="#101814" strokeWidth="2" />
        </g>
      ))}
      <path d="M180 66c10-22 22-34 36-38" stroke="#f3efe6" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 5" />
      <g transform="rotate(12 206 40)">
        <path d="M188 18h30l10 14-10 14h-30a5 5 0 0 1-5-5V23a5 5 0 0 1 5-5Z" fill={signal} stroke="#101814" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="219" cy="32" r="3" fill="#101814" />
        <text x="197" y="37" fontFamily="var(--font-tag)" fontSize="12" fontWeight="700" fill="#1d0d03">$$</text>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------------
   Theme-card spot illustrations (homepage "Pick a lane"), 72×72.
--------------------------------------------------------------------- */
export function BudgetArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" fill="none">
      <ellipse cx="30" cy="54" rx="16" ry="5" fill={soft} {...S} />
      <path d="M14 54v-6c0 2.8 7.2 5 16 5s16-2.2 16-5v6" fill={soft} {...S} />
      <ellipse cx="30" cy="42" rx="16" ry="5" fill={card} {...S} />
      <path d="M14 42v-6c0 2.8 7.2 5 16 5s16-2.2 16-5v6" fill={card} {...S} />
      <ellipse cx="30" cy="30" rx="16" ry="5" fill={signal} {...S} />
      <path d="M50 14v22M43 29l7 7 7-7" stroke={green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function FourKArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" fill="none">
      <rect x="8" y="12" width="56" height="36" rx="4" fill={card} {...S} />
      <path d="M12 44 26 30l9 9 7-6 18 11" stroke={signal} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="48" cy="22" r="4" fill={signal} />
      <path d="M28 60h16M36 48v12" {...S} />
      <text x="13" y="25" fontFamily="var(--font-tag)" fontSize="9" fontWeight="700" fill={ink}>4K</text>
    </svg>
  );
}
export function DeskArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" fill="none">
      <rect x="6" y="30" width="44" height="22" rx="4" fill={card} {...S} />
      <path d="M12 37h4M20 37h4M28 37h4M36 37h4M12 44h28" {...S} strokeWidth="2.6" />
      <path d="M44 37h.01" stroke={signal} strokeWidth="4" strokeLinecap="round" />
      <rect x="54" y="30" width="12" height="20" rx="6" fill={signal} {...S} />
      <path d="M60 30v6" {...S} />
      <path d="M60 30c0-8-6-10-12-12" {...S} strokeDasharray="1 4" />
    </svg>
  );
}
export function PartsArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true" fill="none">
      <path d="M22 10v6M30 10v6M38 10v6M22 44v6M30 44v6M38 44v6M10 22h6M10 30h6M10 38h6M44 22h6M44 30h6M44 38h6" {...S} />
      <rect x="16" y="16" width="28" height="28" rx="4" fill={card} {...S} />
      <rect x="24" y="24" width="12" height="12" rx="2" fill={signal} {...S} />
      <rect x="40" y="52" width="28" height="10" rx="2" fill={soft} {...S} transform="rotate(-18 54 57)" />
    </svg>
  );
}

/** Three stacked answer pills, one ticked. PC Finder promo. */
export function QuizArt({ className = "" }: P) {
  return (
    <svg viewBox="0 0 220 160" className={className} aria-hidden="true" fill="none">
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i === 1 ? 14 : 0} ${18 + i * 44}) rotate(${i === 1 ? -2 : i === 2 ? 1.5 : -0.5})`}>
          <rect x="10" y="0" width="190" height="34" rx="10" fill={i === 1 ? "#ff6a2e" : "#1b2821"} stroke={i === 1 ? "#101814" : "rgba(243,239,230,.22)"} strokeWidth="2" />
          <circle cx="30" cy="17" r="8" fill={i === 1 ? "#101814" : "transparent"} stroke={i === 1 ? "#101814" : "rgba(243,239,230,.45)"} strokeWidth="2" />
          {i === 1 && <path d="m26 17 3 3 5-6" stroke="#ff6a2e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="48" y="13" width={i === 1 ? 92 : i === 0 ? 118 : 70} height="8" rx="4" fill={i === 1 ? "#1d0d03" : "rgba(243,239,230,.35)"} />
        </g>
      ))}
      <path d="M176 14c10-6 22-2 24 8" stroke="#d4a73a" strokeWidth="2" strokeLinecap="round" />
      <path d="m196 18 4 5 4-6" stroke="#d4a73a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A little speech bubble pair. Empty inbox. */
export function ChatArt({ className = "empty-art" }: P) {
  return (
    <svg viewBox="0 0 160 124" className={className} aria-hidden="true" fill="none">
      <ellipse cx="80" cy="112" rx="50" ry="6" fill={soft} />
      <path d="M24 26h70a10 10 0 0 1 10 10v26a10 10 0 0 1-10 10H50l-16 14 2-14h-12a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10Z" fill={card} {...S} />
      <path d="M32 44h50M32 55h32" {...S} opacity=".35" />
      <path d="M136 56H90a10 10 0 0 0-10 10v18a10 10 0 0 0 10 10h28l14 11-2-11h6a10 10 0 0 0 10-10V66a10 10 0 0 0-10-10Z" fill={signal} {...S} />
      <path d="M95 75h.01M108 75h.01M121 75h.01" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Circuit traces for dark "board" panels. Purely decorative. */
export function Traces({ className = "" }: P) {
  return (
    <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" className={`traces ${className}`} aria-hidden="true">
      <path d="M-10 60h140l30 30h120l20-20h140l40 40h130" />
      <path d="M-10 230h90l40-40h160l30 30h110l30-30h160" />
      <path d="M250 -10v60l30 30v80l-20 20v130" />
      <path d="M470 -10v40l-30 30v70l30 30v150" />
      <path className="pulse" d="M-10 60h140l30 30h120l20-20h140l40 40h130" />
      <path className="pulse" style={{ animationDelay: "4.2s" }} d="M-10 230h90l40-40h160l30 30h110l30-30h160" />
      {[[130, 60], [280, 90], [440, 70], [80, 230], [320, 190], [460, 220], [250, 50], [470, 30]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" />
      ))}
    </svg>
  );
}
