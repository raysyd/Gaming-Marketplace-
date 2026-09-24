"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";

const STEPS = [
  ["Buyer pays", `The full amount goes to ${BRAND.name}, not to the seller's account.`, "💳"],
  ["We hold it", "The money sits with us. The seller can see it's there and waiting.", "🔒"],
  ["Seller ships", "Tracking is added to the order so both sides can follow the box.", "📦"],
  ["We release", `Delivery confirmed, the seller is paid minus ${BRAND.feePercent}%.`, "✅"],
] as const;

/**
 * Animated escrow explainer: a coin travels along the timeline and each
 * step lights up as it arrives. Starts when scrolled into view, loops.
 */
export function EscrowFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(STEPS.length - 1);
      return;
    }
    let t: ReturnType<typeof setTimeout>;
    let s = -1;
    const run = () => {
      s = s >= STEPS.length - 1 ? -1 : s + 1;
      setStep(s);
      t = setTimeout(run, s === STEPS.length - 1 ? 3200 : s === -1 ? 500 : 1500);
    };
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(t);
      if (e.isIntersecting) run();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t); };
  }, []);

  const pct = step < 0 ? 0 : (step / (STEPS.length - 1)) * 100;

  return (
    <div ref={ref} className="escrow-flow">
      <div className="escrow-track" aria-hidden="true">
        <span className="escrow-fill" style={{ width: `${pct}%` }} />
        <span className="escrow-coin" style={{ left: `${pct}%`, opacity: step < 0 ? 0 : 1 }}>$</span>
      </div>
      <ol className="escrow-steps">
        {STEPS.map(([title, body, icon], k) => (
          <li key={title} className={k <= step ? "is-lit" : ""}>
            <span className="escrow-dot" aria-hidden="true">{icon}</span>
            <span className="spec text-deal">0{k + 1}</span>
            <h3 className="mt-1 text-[15px] font-semibold">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
