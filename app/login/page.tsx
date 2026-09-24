import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { ProductImage } from "@/components/ProductImage";
import { BRAND } from "@/lib/brand";
import { queryListings } from "@/lib/data";

export const metadata = { title: `Sign in — ${BRAND.name}` };

/**
 * Sign-in sits in a card over a slowly drifting, blurred wall of real
 * listings, so the first thing a new visitor sees is the marketplace itself.
 */
export default async function LoginPage() {
  const { items } = await queryListings({ sort: "watched", perPage: 12 });
  const wall = [...items, ...items].slice(0, 16);

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="login-wall pointer-events-none absolute inset-0 -z-10">
        <div className="login-wall-grid">
          {wall.map((l, i) => (
            <div key={`${l.id}-${i}`} className="overflow-hidden rounded-[14px] bg-ink">
              <ProductImage src={l.image} alt="" category={l.category} seed={l.id} showStockBadge={false} className="aspect-[4/3] w-full" />
            </div>
          ))}
        </div>
        <div className="login-wall-fade" />
      </div>

      <div className="px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-[460px] rounded-[20px] border border-line bg-card/95 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)] backdrop-blur">
          <Suspense fallback={<div className="px-8 py-24 text-center text-muted">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
