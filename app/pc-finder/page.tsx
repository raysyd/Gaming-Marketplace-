"use client";
import { useState } from "react";
import Link from "next/link";
import { money } from "@/lib/format";
import { BRAND } from "@/lib/brand";

const STEPS = [
  {
    key: "budget",
    question: "What's your budget?",
    options: [
      ["Under $1,000", "0-1000"],
      ["$1,000 – $2,000", "1000-2000"],
      ["$2,000 – $3,500", "2000-3500"],
      ["$3,500+", "3500-99999"],
    ],
  },
  {
    key: "res",
    question: "What do you want to play at?",
    options: [
      ["1080p high refresh", "1080p"],
      ["1440p", "1440p"],
      ["4K", "4k"],
      ["Not sure yet", "any"],
    ],
  },
  {
    key: "use",
    question: "What else will it do?",
    options: [
      ["Just games", "games"],
      ["Streaming too", "stream"],
      ["Editing / 3D work", "creator"],
      ["AI / ML workloads", "ai"],
    ],
  },
] as const;

export default function PcFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const choose = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setStep((s) => s + 1);
  };

  if (step >= STEPS.length) {
    const [min, max] = (answers.budget ?? "0-99999").split("-").map(Number);
    const sub =
      answers.use === "creator" || answers.use === "ai"
        ? "workstations"
        : "gaming-pcs";
    const href = `/shop?category=full-systems&sub=${sub}&min=${min}&max=${max}&sort=new`;

    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <p className="eyebrow text-deal">Your match</p>
        <h1 className="display mt-2 text-[30px]">
          {answers.res === "4k"
            ? "You want a 4K-capable build"
            : answers.res === "1440p"
              ? "You want a 1440p build"
              : "You want a high-refresh 1080p build"}
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          Between {money(min)} and {money(max)}, from Australian sellers, with
          payment held until it arrives.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={href}
            className="btn btn-primary"
          >
            See matching builds
          </Link>
          <button
            onClick={() => {
              setStep(0);
              setAnswers({});
            }}
            className="rounded-md border border-line px-6 py-3 text-[14px] font-semibold"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const current = STEPS[step];

  return (
    <div className="mx-auto max-w-[560px] px-4 py-20">
      <p className="eyebrow">
        PC Finder · step {step + 1} of {STEPS.length}
      </p>
      <div className="mt-3 h-1 w-full rounded bg-line">
        <div
          className="h-1 rounded bg-deal transition-all"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>
      <h1 className="display mt-6 text-[30px]">{current.question}</h1>
      <div className="mt-6 space-y-2">
        {current.options.map(([label, value]) => (
          <button
            key={value}
            onClick={() => choose(current.key, value)}
            className="w-full panel px-5 py-4 text-left text-[15px] font-medium transition hover:border-ink/40 hover:bg-paper"
          >
            {label}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button
          onClick={() => setStep((s) => s - 1)}
          className="spec mt-5 text-muted underline"
        >
          Back
        </button>
      )}
      <p className="spec mt-8 text-muted">
        {BRAND.name} doesn&apos;t hold stock — this points you at listings from
        real sellers that match what you described.
      </p>
    </div>
  );
}
