import { ImageResponse } from "next/og";

// There's no existing favicon or logo image file anywhere in this repo —
// generated here instead of sourcing one, matching the same rgb-accent
// wordmark style used for the "Sidegrade." logo in SiteHeader/SiteFooter
// (see .rgb-text in app/globals.css), just rendered as a static PNG since
// a favicon can't run CSS animation. The larger PWA-manifest icon sizes
// (192/512) live at app/api/pwa-icon/[size] instead of here, so their
// URLs are predictable strings app/manifest.ts can reference directly.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080808",
          borderRadius: 6,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 20,
          color: "#f6f6f6",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
