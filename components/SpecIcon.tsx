/**
 * Line icon for a spec label, so spec grids and the listing page's spec
 * sheet read at a glance. Every label in lib/specs.ts and lib/demo.ts has
 * a mapping; anything unrecognised gets the generic "info" mark.
 */

type IconName =
  | "gpu" | "cpu" | "ram" | "drive" | "bolt" | "plug" | "layers" | "fan" | "ruler"
  | "slots" | "box" | "tag" | "shield" | "badge" | "monitor" | "palette" | "usb"
  | "keyboard" | "mouse" | "weight" | "wifi" | "mic" | "headphones" | "gamepad"
  | "gift" | "battery" | "clock" | "glass" | "warning" | "check" | "gauge" | "pin" | "info";

const LABEL_ICON: Record<string, IconName> = {
  gpu: "gpu", model: "tag", brand: "tag",
  cpu: "cpu", socket: "cpu", cores: "cpu", "cores / threads": "cpu", chipset: "cpu",
  ram: "ram", memory: "ram", capacity: "ram", kit: "ram", "ecc support": "ram",
  ssd: "drive", storage: "drive",
  vram: "layers", type: "layers",
  psu: "bolt", wattage: "bolt", "efficiency rating": "bolt",
  modular: "plug", "power connector": "plug",
  cooling: "fan", cooler: "fan", "fan count": "fan", "fans included": "fan", "radiator size": "fan",
  length: "ruler", size: "ruler", "screen size": "monitor",
  slots: "slots", "form factor": "box",
  condition: "shield", "condition notes": "shield", tested: "check",
  warranty: "badge",
  "refresh rate": "gauge", resolution: "monitor", "panel type": "monitor",
  "base clock": "gauge", speed: "gauge", "read speed": "gauge",
  color: "palette", rgb: "palette",
  "front i/o": "usb", connector: "usb",
  "switch type": "keyboard", layout: "keyboard",
  dpi: "mouse", weight: "weight",
  wireless: "wifi", mic: "mic", "surround sound": "headphones",
  "included controllers": "gamepad",
  bundle: "gift", "included accessories": "gift", "included items": "gift",
  "battery life": "battery", era: "clock", "tempered glass": "glass",
  "fault description": "warning", "what doesn't": "warning", "what works": "check",
  "ships from": "pin",
};

const PATHS: Record<IconName, React.ReactNode> = {
  gpu: <><rect x="2" y="7" width="20" height="10" rx="1.5" /><circle cx="9" cy="12" r="2.5" /><circle cx="16" cy="12" r="2.5" /><path d="M5 17v2M8 17v2" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9.5" y="9.5" width="5" height="5" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></>,
  ram: <><rect x="2" y="8" width="20" height="8" rx="1" /><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 11h2M11 11h2M16 11h2" /></>,
  drive: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 14h.01M11 14h6" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  plug: <><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 01-12 0z" /><path d="M12 17v5" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /></>,
  fan: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="1.5" /><path d="M12 10.5c0-3 1-5 3-5s2 3-1.5 5.5M13.5 12.5c2.5 1.5 3.5 3.5 2.3 5.2s-3.8.3-4.3-3.7M10.5 12.5c-2.6 1.2-4.8.8-5.3-1.2s2.1-3.3 5.3-.8" /></>,
  ruler: <><rect x="2" y="9" width="20" height="6" rx="1" /><path d="M6 9v3M10 9v2M14 9v3M18 9v2" /></>,
  slots: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M9 4v16M15 4v16" /></>,
  box: <><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>,
  tag: <><path d="M3 12V4a1 1 0 011-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
  shield: <><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></>,
  badge: <><circle cx="12" cy="9" r="6" /><path d="M8.5 14L7 22l5-3 5 3-1.5-8" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  palette: <><path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-2 2.5-2H18a3 3 0 003-3c0-4.5-4-8.5-9-8.5z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  usb: <><path d="M12 2v14M12 2l-2.5 3h5z" /><path d="M12 11l-4-2v-2M12 13l4-2V9" /><circle cx="12" cy="19" r="2.5" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="1.5" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  mouse: <><rect x="6" y="3" width="12" height="18" rx="6" /><path d="M12 7v4" /></>,
  weight: <><path d="M6.5 8h11l2.5 12H4z" /><circle cx="12" cy="5.5" r="2.5" /></>,
  wifi: <><path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0" /><path d="M12 19.5h.01" /></>,
  mic: <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v4" /></>,
  headphones: <><path d="M4 16v-4a8 8 0 0116 0v4" /><rect x="3" y="14" width="4" height="7" rx="1.5" /><rect x="17" y="14" width="4" height="7" rx="1.5" /></>,
  gamepad: <><path d="M6 8h12a4 4 0 014 4.5l-.8 4a2.5 2.5 0 01-4.3 1.2L15 16H9l-1.9 1.7a2.5 2.5 0 01-4.3-1.2l-.8-4A4 4 0 016 8z" /><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 13.5h.01" /></>,
  gift: <><rect x="3" y="9" width="18" height="12" rx="1" /><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z" /></>,
  battery: <><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2M5 10v4M8 10v4M11 10v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  glass: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 13l5-5M9 17l7-7" /></>,
  warning: <><path d="M12 3L2 20h20z" /><path d="M12 10v4M12 17h.01" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  gauge: <><path d="M4 18a9 9 0 1116 0" /><path d="M12 14l4-5" /><circle cx="12" cy="14" r="1.2" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
};

export function SpecIcon({ label, size = 14 }: { label: string; size?: number }) {
  const name = LABEL_ICON[label.toLowerCase()] ?? "info";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-icon"
    >
      {PATHS[name]}
    </svg>
  );
}
