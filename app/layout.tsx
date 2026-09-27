import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
// Loaded after globals.css so its tokens and overrides win.
import "./market.css";
import { BRAND } from "@/lib/brand";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: pinch-zoom must stay available.
  viewportFit: "cover",
  // Light by default (app/market.css); dark is an opt-in from ThemeToggle.
  // The browser chrome matches the black header either way.
  themeColor: "#101114",
};

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s — ${BRAND.name}` },
  description: BRAND.blurb,
};

const THEME_SCRIPT = `try{if(localStorage.getItem("sidegrade.theme")==="dark"){var c=document.documentElement.classList;c.remove("light");c.add("dark")}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        {/* Runs before first paint so someone who picked dark mode never
            sees a flash of the wrong theme (ThemeToggle writes this key). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600..900&family=Inter:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
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
        <ServiceWorkerRegistration />
        <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <Suspense fallback={<div className="h-[112px] bg-chrome" />}>
            <SiteHeader />
          </Suspense>
          <main className="min-h-[70vh]">{children}</main>
          <SiteFooter />
          </WishlistProvider>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
