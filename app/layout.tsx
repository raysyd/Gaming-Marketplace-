import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { WishlistProvider } from "@/components/WishlistProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximum-scale: pinch-zoom must stay available.
  viewportFit: "cover",
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
      </head>
      <body>
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
