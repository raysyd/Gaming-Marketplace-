import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { ProductImage } from "@/components/ProductImage";
import { BRAND } from "@/lib/brand";
import { queryListings } from "@/lib/data";
import { Icon } from "@/components/ui/Icon";
import { Traces } from "@/components/ui/Illustrations";

export const metadata = { title: `Sign in — ${BRAND.name}` };

/**
 * Split sign-in: on wide screens the left half is a dark board with a
 * slowly drifting wall of real listings behind the three promises, so
 * the first thing a new visitor sees is the marketplace itself. On
 * phones it's just the form.
 */
export default async function LoginPage() {
  const { items } = await queryListings({ sort: "watched", perPage: 12 });
  const wall = [...items, ...items].slice(0, 16);

  return (
    <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-8 lg:grid-cols-2 lg:px-8 lg:py-10">
      <aside className="relative isolate hidden min-h-[640px] overflow-hidden rounded-[22px] bg-chrome p-10 text-[#f3efe6] lg:flex lg:flex-col">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="login-wall-grid !opacity-30">
            {wall.map((l, i) => (
              <div key={`${l.id}-${i}`} className="overflow-hidden rounded-[14px] bg-chrome-2">
                <ProductImage src={l.image} alt="" category={l.category} seed={l.id} showStockBadge={false} className="aspect-[4/3] w-full" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#101814] via-[#101814]/85 to-[#101814]/40" />
          <Traces className="absolute inset-0 h-full w-full opacity-40" />
        </div>

        <p className="tag-label text-[#d4a73a]">Welcome to the bench</p>
        <h2 className="display mt-4 max-w-md text-[clamp(38px,3.6vw,56px)]">
          Trade hardware with people who{" "}
          <span className="hand text-[1.1em] font-semibold text-[#ff8a57]">actually</span> game.
        </h2>
        <ul className="mt-auto space-y-4">
          {(
            [
              ["lock", "Your money waits in escrow", "Released only once you confirm it arrived."],
              ["shield", "Verified sellers", "Identity checked through Stripe — never a paid badge."],
              ["tag", "Free to list", `Sellers pay ${BRAND.feePercent}% when it sells. Buyers pay no fee.`],
            ] as const
          ).map(([icon, title, body]) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-[#d4a73a]/40 bg-[#d4a73a]/10 text-[#f3cf6f]">
                <Icon name={icon} size={19} />
              </span>
              <div>
                <p className="text-[15px] font-semibold">{title}</p>
                <p className="mt-0.5 text-[13.5px] text-[#9aa59d]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex items-center justify-center rounded-[22px] py-6 sm:border sm:border-line sm:bg-card sm:px-10 sm:py-14 sm:shadow-[var(--shadow-sm)]">
        <Suspense
          fallback={
            <div className="w-full max-w-[440px] space-y-4" aria-busy="true">
              <div className="skeleton h-10 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton mt-6 h-11 w-full" />
              <div className="skeleton h-11 w-full" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
