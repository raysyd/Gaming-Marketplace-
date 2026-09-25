import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono, Caveat } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

// Self-hosted through next/font: no request to Google from the visitor's
// browser, and no layout shift while the faces load.
//   Display  — Bricolage Grotesque: a grotesk with ink-trap quirks, gives
//              headings a hand-cut, poster-shop personality.
//   Body     — Instrument Sans: calm, slightly condensed, very legible at
//              the small sizes a spec-heavy marketplace lives at.
//   Tag      — JetBrains Mono: only for the tiny "shelf tag" labels (lot
//              numbers, stickers, counters). Never body copy.
//   Hand     — Caveat: the odd scribbled margin note. Used a handful of
//              times site-wide, on purpose.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"], display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", axes: ["wdth"], display: "swap" });
const tag = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["500", "700"], display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["600"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: pinch-zoom must stay available.
  viewportFit: "cover",
  // Matches app/globals.css's --color-paper light/dark values. The browser
  // reads this from system preference, independently of the html.dark
  // class the theme toggle sets.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1110" },
  ],
};

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.blurb,
};

// Runs before first paint, so a saved (or system) dark preference never
// flashes the light theme first. ThemeToggle reads the same storage key.
const THEME_SCRIPT = `try{var t=localStorage.getItem("sidegrade.theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${tag.variable} ${hand.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
        />
      </head>
      {/* Browser extensions (currency converters, password managers, Grammarly…)
          add their own attributes to <body> before React loads. That's not a
          real mismatch, so don't warn about it. Only affects this one element. */}
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">Skip to content</a>
        <ServiceWorkerRegistration />
        <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <ToastProvider>
          <Suspense fallback={<div className="h-[118px] border-b border-line bg-paper" />}>
            <SiteHeader />
          </Suspense>
          <main id="main" className="min-h-[70vh]">{children}</main>
          <SiteFooter />
          </ToastProvider>
          </WishlistProvider>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
