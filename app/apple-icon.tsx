import { ImageResponse } from "next/og";

// Apple touch icons are expected larger and without transparency —
// same mark as app/icon.tsx, just at the size iOS actually asks for.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 110,
          color: "#f6f6f6",
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
