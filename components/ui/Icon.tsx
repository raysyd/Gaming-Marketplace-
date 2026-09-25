/**
 * One line-icon set for the whole site: 24px grid, round caps, 1.8
 * stroke, drawn to sit with SpecIcon's hardware glyphs. Replaces the
 * emoji (🛒 🔒 📦 ✅) and one-off inline SVGs the old UI mixed together.
 */
export type IconName =
  | "search" | "heart" | "bag" | "bell" | "user" | "chat" | "plus" | "minus"
  | "arrow-right" | "arrow-left" | "arrow-up-right" | "chevron-down" | "chevron-right" | "chevron-left"
  | "check" | "check-circle" | "x" | "lock" | "shield" | "truck" | "package" | "card" | "coins"
  | "clock" | "star" | "bolt" | "tag" | "camera" | "warning" | "info" | "eye" | "trash" | "pencil"
  | "logout" | "settings" | "grid" | "filter" | "pin" | "refresh" | "upload" | "image" | "mail"
  | "sparkle" | "store" | "list" | "wallet" | "handshake" | "trending-down" | "flame" | "key"
  | "google" | "cpu" | "monitor" | "gamepad" | "keyboard" | "menu" | "sun" | "moon" | "bookmark";

const P: Record<IconName, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  heart: <path d="M12 20s-7.5-4.5-9.2-9.1A4.9 4.9 0 0 1 12 6.8a4.9 4.9 0 0 1 9.2 4.1C19.5 15.5 12 20 12 20Z" />,
  bag: <><path d="M5 8h14l-1.1 11.1a2 2 0 0 1-2 1.9H8.1a2 2 0 0 1-2-1.9Z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>,
  user: <><circle cx="12" cy="8.5" r="3.6" /><path d="M4.8 20c.9-3.7 3.6-5.7 7.2-5.7s6.3 2 7.2 5.7" /></>,
  chat: <path d="M4.5 18.5 5.6 15A7.5 7.5 0 1 1 9 18.6Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "check-circle": <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.3 2.6 2.6 5-5.3" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /><path d="M12 14.5v2" /></>,
  shield: <><path d="M12 3.2 19 6v5.6c0 4.4-2.9 7.7-7 9.2-4.1-1.5-7-4.8-7-9.2V6Z" /><path d="m9 12 2.2 2.2L15.3 10" /></>,
  truck: <><path d="M3 6.5h11v9.5H3zM14 10h3.8l3.2 3.3V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></>,
  package: <><path d="M4 7.5 12 3.5l8 4v9L12 20.5l-8-4Z" /><path d="m4 7.5 8 4 8-4M12 11.5v9M8 5.5l8 4" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><path d="M3 10h18M7 14.5h3" /></>,
  coins: <><ellipse cx="9" cy="7.5" rx="5.5" ry="2.5" /><path d="M3.5 7.5v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4" /><path d="M9.5 16.3c.9 1.3 3.1 2.2 5.5 2.2 3 0 5.5-1.1 5.5-2.5v-4c0-1.2-1.8-2.2-4.3-2.4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  star: <path d="m12 3.8 2.5 5.1 5.6.8-4.1 3.9 1 5.6L12 16.6l-5 2.6 1-5.6-4.1-3.9 5.6-.8Z" />,
  bolt: <path d="M13 2.8 5 13.5h6l-1 7.7 8-10.7h-6Z" />,
  tag: <><path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5Z" /><circle cx="8" cy="8" r="1.5" /></>,
  camera: <><rect x="3" y="7.5" width="18" height="12.5" rx="2.2" /><path d="m8 7.5 1.6-3h4.8L16 7.5" /><circle cx="12" cy="13.5" r="3.3" /></>,
  warning: <><path d="M12 4 21.2 19.5H2.8Z" /><path d="M12 10v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" /><path d="M10 11v6M14 11v6" /></>,
  pencil: <><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16Z" /><path d="m14 6 4 4" /></>,
  logout: <><path d="M14 4.5H6.5a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path d="M10 12h10M16.5 8.5 20 12l-3.5 3.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  pin: <><path d="M12 21s-7-6.2-7-11.2a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.5" /></>,
  refresh: <><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4.2h-4.2" /></>,
  upload: <><path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.2" /><circle cx="9" cy="9.5" r="1.7" /><path d="m20.5 16-5-5-8.5 8.5" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.2" /><path d="m3.8 7 8.2 6 8.2-6" /></>,
  sparkle: <path d="M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5ZM18.5 15.5c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9Z" />,
  store: <><path d="M4 9.5 5.5 4.5h13L20 9.5" /><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" /><path d="M5.5 12v8h13v-8M10 20v-4.5h4V20" /></>,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  wallet: <><path d="M4 7.5a2 2 0 0 1 2-2h11.5v3" /><rect x="4" y="8.5" width="16.5" height="11" rx="2" /><path d="M16.5 14h.01" /></>,
  handshake: <><path d="m11 7-2.5-1.5L3 8.5v6l2 1" /><path d="m13 7 2.5-1.5L21 8.5v6l-5.5 3.5-5.5-4 2.3-2 3 1.5" /><path d="M5 15.5 8.5 18.5l1.5-1" /></>,
  "trending-down": <><path d="m3.5 7 6 6 3.5-3.5 7.5 7.5" /><path d="M20.5 11.5V17H15" /></>,
  flame: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.9 3-5.6 3.7-9.4 2.2 1.3 3.2 3.3 3.3 5.4 1-.6 1.6-1.6 1.8-2.8 2 1.7 4.2 3.8 4.2 6.8 0 3.5-2.6 6.1-6.5 6.1Z" />,
  key: <><circle cx="8" cy="15" r="4.2" /><path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2" /></>,
  google: <path d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6ZM12 21c2.4 0 4.5-.8 5.9-2.2L15 16.6c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21ZM7 13.8a5.4 5.4 0 0 1 0-3.6V7.9H4a9 9 0 0 0 0 8.2ZM12 6.6c1.3 0 2.5.5 3.4 1.4L18 5.4A9 9 0 0 0 4 7.9l3 2.3c.7-2.1 2.7-3.6 5-3.6Z" />,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9.5" y="9.5" width="5" height="5" rx=".5" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12.5" rx="1.8" /><path d="M8.5 20h7M12 16.5V20" /></>,
  gamepad: <><path d="M6.5 8h11a4 4 0 0 1 4 4.4l-.6 3.8a2.5 2.5 0 0 1-4.3 1.3L15 16H9l-1.6 1.5a2.5 2.5 0 0 1-4.3-1.3l-.6-3.8a4 4 0 0 1 4-4.4Z" /><path d="M7.5 11v3M6 12.5h3M15.5 12h.01M17.5 13.5h.01" /></>,
  keyboard: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
  bookmark: <path d="M6.5 4h11v16.5L12 16.5l-5.5 4Z" />,
};

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className = "",
  filled = false,
  title,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  filled?: boolean;
  title?: string;
}) {
  const isBrand = name === "google";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isBrand || filled ? "currentColor" : "none"}
      stroke={isBrand ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={`shrink-0 ${className}`}
    >
      {title && <title>{title}</title>}
      {P[name]}
    </svg>
  );
}
