"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades and lifts its content in the first time it scrolls into view.
 * `stagger` delays each direct child a little more than the last, so a
 * grid of cards cascades in instead of popping all at once.
 * The hidden state lives in CSS (.reveal in globals.css), and reduced-motion
 * users get the content immediately.
 */
export function Reveal({
  children,
  className = "",
  stagger = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  as?: "div" | "section" | "ul" | "ol";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.on = "";
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`}>
      {children}
    </Tag>
  );
}
