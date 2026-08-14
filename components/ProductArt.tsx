import type { Category } from "@/lib/types";

/**
 * Sellers upload real photos; until they do, every listing still gets a
 * recognisable piece of hardware art instead of a grey box.
 */
export function ProductArt({
  category,
  seed,
  className = "",
}: {
  category: Category;
  seed: string;
  className?: string;
}) {
  const hue = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const a = `hsl(${hue} 55% 62%)`;
  const b = `hsl(${(hue + 40) % 360} 60% 44%)`;
  const id = `g-${seed.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox="0 0 320 240"
      className={className}
      role="img"
      aria-label={`${category} illustration`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill="#0f131b" />
      <g opacity="0.14" stroke="#fff" strokeWidth="1">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1="0" y1={i * 30 + 15} x2="320" y2={i * 30 + 15} />
        ))}
      </g>
      {art(category, id)}
    </svg>
  );
}

function art(category: Category, id: string) {
  const fill = `url(#${id})`;
  const line = "#0f131b";

  if (category === "Graphics Cards")
    return (
      <g>
        <rect x="46" y="82" width="228" height="78" rx="6" fill={fill} />
        <rect x="46" y="150" width="228" height="12" rx="3" fill="#0b0e14" opacity=".45" />
        <circle cx="106" cy="120" r="27" fill={line} opacity=".85" />
        <circle cx="214" cy="120" r="27" fill={line} opacity=".85" />
        {[106, 214].map((cx) =>
          Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`${cx}-${i}`}
              x1={cx}
              y1={120}
              x2={cx + 24 * Math.cos((i * Math.PI * 2) / 7)}
              y2={120 + 24 * Math.sin((i * Math.PI * 2) / 7)}
              stroke="#fff"
              strokeWidth="2"
              opacity=".55"
            />
          ))
        )}
        <rect x="60" y="162" width="200" height="10" rx="2" fill="#8a93a5" opacity=".5" />
      </g>
    );

  if (category === "Processors")
    return (
      <g>
        <rect x="104" y="64" width="112" height="112" rx="8" fill={fill} />
        <rect x="126" y="86" width="68" height="68" rx="4" fill={line} opacity=".8" />
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i}>
            <rect x={110 + i * 10} y="52" width="4" height="14" rx="2" fill="#8a93a5" />
            <rect x={110 + i * 10} y="174" width="4" height="14" rx="2" fill="#8a93a5" />
          </g>
        ))}
      </g>
    );

  if (category === "Monitors")
    return (
      <g>
        <rect x="34" y="44" width="252" height="140" rx="7" fill={line} />
        <rect x="42" y="52" width="236" height="124" rx="4" fill={fill} />
        <rect x="140" y="184" width="40" height="24" fill={line} />
        <rect x="106" y="206" width="108" height="9" rx="4" fill={line} />
      </g>
    );

  if (category === "Laptops")
    return (
      <g>
        <rect x="66" y="46" width="188" height="118" rx="6" fill={line} />
        <rect x="74" y="54" width="172" height="102" rx="3" fill={fill} />
        <path d="M40 168 h240 l16 26 H24 Z" fill="#8a93a5" opacity=".9" />
      </g>
    );

  if (category === "Consoles")
    return (
      <g>
        <rect x="96" y="40" width="128" height="164" rx="14" fill={fill} />
        <rect x="126" y="40" width="24" height="164" fill={line} opacity=".55" />
        <circle cx="196" cy="176" r="7" fill="#fff" opacity=".8" />
      </g>
    );

  if (category === "Peripherals")
    return (
      <g>
        <rect x="40" y="86" width="240" height="72" rx="8" fill={fill} />
        {Array.from({ length: 5 }).map((_, r) =>
          Array.from({ length: 14 }).map((_, c) => (
            <rect
              key={`${r}-${c}`}
              x={50 + c * 16.5}
              y={94 + r * 13}
              width="13"
              height="10"
              rx="2"
              fill={line}
              opacity=".72"
            />
          ))
        )}
      </g>
    );

  // Prebuilt PCs
  return (
    <g>
      <rect x="92" y="28" width="136" height="188" rx="8" fill={line} />
      <rect x="102" y="38" width="116" height="168" rx="4" fill={fill} opacity=".92" />
      <rect x="112" y="52" width="96" height="42" rx="3" fill="#0b0e14" opacity=".55" />
      {[118, 154, 190].map((cy) => (
        <g key={cy}>
          <circle cx="160" cy={cy} r="15" fill="#0b0e14" opacity=".6" />
          <circle cx="160" cy={cy} r="5" fill="#fff" opacity=".7" />
        </g>
      ))}
    </g>
  );
}
