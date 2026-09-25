import { ImageResponse } from "next/og";
import { IconMark } from "@/lib/icon-mark";

// The favicon: the chip-and-arrows mark from components/ui/Logo.tsx on a
// small bone tile, so it reads on both light and dark browser chrome.
// The PWA manifest sizes live at app/api/pwa-icon/[size] so their URLs
// are predictable strings app/manifest.ts can reference directly.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconMark size={32} />, { ...size });
}
