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
  // Matches app/globals.css's --color-paper light/dark values — the
  // browser reads this independently of the html.dark class ThemeToggle
  // sets, so it follows system preference rather than a manual override;
  // a minor, purely cosmetic imprecision for anyone who's toggled
  // against their system setting, not a functional one.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
};

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.blurb,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Inter:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap"
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
      <body>
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
