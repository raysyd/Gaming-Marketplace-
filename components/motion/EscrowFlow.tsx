"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import { Icon, type IconName } from "@/components/ui/Icon";

const STEPS = [
  ["Buyer pays", `The full amount goes to ${BRAND.name}, not to the seller's account.`, "card"],
  ["We hold it", "The money sits with us. The seller can see it's there and waiting.", "lock"],
  ["Seller ships", "Tracking is added to the order so both sides can follow the box.", "package"],
  ["We release", `Delivery confirmed, the seller is paid minus ${BRAND.feePercent}%.`, "check-circle"],
] as const satisfies readonly (readonly [string, string, IconName])[];

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
            <span className="escrow-dot" aria-hidden="true"><Icon name={icon} size={21} /></span>
            <span className="tag-label text-[#d4a73a]">Step 0{k + 1}</span>
            <h3 className="mt-1.5 text-[16px] font-semibold text-[#f3efe6]">{title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#9aa59d]">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
