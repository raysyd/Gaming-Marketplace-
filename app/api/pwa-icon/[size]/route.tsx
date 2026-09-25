import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { IconMark } from "@/lib/icon-mark";

/**
 * PWA manifest icons (app/manifest.ts references /api/pwa-icon/192 and
 * /api/pwa-icon/512 directly) — a route handler rather than the
 * app/icon.tsx file convention, so the URL is a predictable string
 * instead of depending on Next's internal convention-generated path.
 * Only 192/512 are ever actually requested (the two sizes Chrome's PWA
 * installability check wants); anything else 400s rather than silently
 * rendering an arbitrary size.
 */
const ALLOWED_SIZES = [192, 512];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED_SIZES.includes(size))
    return NextResponse.json({ error: "Unsupported icon size." }, { status: 400 });

  return new ImageResponse(<IconMark size={size} padded />, { width: size, height: size });
}
