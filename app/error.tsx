"use client";

import { useEffect } from "react";

/** Catches render/data errors under the root layout — without this, a thrown error here left the page blank instead of showing anything actionable. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
      <div className="w-full rounded-[10px] border border-line bg-card p-6 text-center sm:p-8">
        <p className="eyebrow text-deal">Something went wrong</p>
        <h1 className="display mt-2 text-[24px]">This page hit an error</h1>
        <p className="mt-2 text-[14px] text-muted">
          Try again, or head back and retry from there.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-md bg-ink px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-chrome-2"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
