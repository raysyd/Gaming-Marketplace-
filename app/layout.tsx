import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
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
  // The site is dark by default (app/globals.css @theme); light is an
  // opt-in from ThemeToggle, so the browser chrome matches the dark page.
  themeColor: "#0b0e14",
};

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.blurb,
};

const THEME_SCRIPT = `try{if(localStorage.getItem("sidegrade.theme")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Runs before first paint so someone who picked light mode never
            sees a flash of dark (ThemeToggle writes this key). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500..700&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..700&display=swap"
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
          <Suspense fallback={<div className="h-[128px] bg-chrome" />}>
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
