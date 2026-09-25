import { ImageResponse } from "next/og";
import { IconMark } from "@/lib/icon-mark";

// Apple touch icons are expected larger and without transparency — same
// mark as app/icon.tsx, inset on a solid bone tile that iOS rounds itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconMark size={180} padded />, { ...size });
}
