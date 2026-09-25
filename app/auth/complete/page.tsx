"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { safeNext } from "@/lib/safe-next";

function CompleteAuthContent() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setError("Sign-in is not configured.");
      return;
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError || !data.session) {
        setError(sessionError?.message ?? "This sign-in link is invalid or has expired.");
        return;
      }
      // Hard navigation, not router.replace() — see the note in
      // LoginForm.tsx for why a soft client-side transition can miss the
      // session cookie that was just written.
      window.location.href = next;
    });
  }, [next]);

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[520px] items-center px-4 py-16">
      <div className="w-full rounded-card border border-line bg-card p-6 text-center sm:p-8">
        {error ? (
          <>
            <p className="eyebrow text-deal">Sign-in link unavailable</p>
            <h1 className="display mt-2 text-3xl">Request a fresh link</h1>
            <p className="mt-3 text-sm text-muted">{error}</p>
            <p className="spec mt-3 text-muted">
              Magic links are single-use and sign in the device that opens the
              link. Request a new link on the device you want to use.
            </p>
            <a
              href="/login"
              className="btn btn-primary mt-6"
            >
              Return to {BRAND.name} sign in
            </a>
          </>
        ) : (
          <>
            <p className="eyebrow text-good">Signing you in</p>
            <h1 className="display mt-2 text-3xl">One moment</h1>
            <p className="mt-3 text-sm text-muted">Your account is being connected on this device.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function CompleteAuthPage() {
  return (
    <Suspense
      fallback={<main className="min-h-[55vh]" aria-busy="true" />}
    >
      <CompleteAuthContent />
    </Suspense>
  );
}