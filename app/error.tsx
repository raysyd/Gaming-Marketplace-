"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UnpluggedArt } from "@/components/ui/Illustrations";

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
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[560px] items-center px-4 py-16">
      <div className="w-full text-center">
        <UnpluggedArt className="mx-auto w-[190px]" />
        <p className="tag-label mt-6 text-danger">Something came loose</p>
        <h1 className="display mt-3 text-[clamp(30px,4vw,42px)]">This page hit an error</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
          Try again, or head back and retry from there. If it keeps happening,
          let us know what you were doing.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-dark">
            <Icon name="refresh" size={17} />
            Try again
          </button>
          <Link href="/" className="btn btn-outline">Go home</Link>
        </div>
      </div>
    </main>
  );
}
