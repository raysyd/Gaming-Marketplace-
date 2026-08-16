"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

function ConfirmDeleteContent() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLinkError("Sign-in is not configured.");
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setLinkError(error?.message ?? "This link is invalid or has expired.");
      }
      setChecking(false);
    });
  }, []);

  const confirmDelete = async () => {
    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in is not configured.");
      return;
    }
    setStatus("deleting");
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    await supabase.auth.signOut();
    setStatus("done");
    setTimeout(() => router.replace("/"), 2000);
  };

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
      <div className="w-full rounded-[10px] border border-line bg-card p-6 text-center sm:p-8">
        {checking ? (
          <p className="text-[14px] text-muted">Checking your link…</p>
        ) : linkError ? (
          <>
            <p className="eyebrow text-deal">Link unavailable</p>
            <h1 className="display mt-2 text-[26px]">Request a fresh link</h1>
            <p className="mt-3 text-[14px] text-muted">{linkError}</p>
            <a
              href="/account/delete"
              className="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-[14px] font-semibold text-white"
            >
              Back to account deletion
            </a>
          </>
        ) : status === "done" ? (
          <>
            <p className="eyebrow text-good">Account deleted</p>
            <h1 className="display mt-2 text-[26px]">Sorry to see you go</h1>
            <p className="mt-3 text-[14px] text-muted">
              Your {BRAND.name} account has been permanently deleted. Taking you home…
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow text-deal">Last step</p>
            <h1 className="display mt-2 text-[26px]">Permanently delete this account?</h1>
            <p className="mt-3 text-[14px] text-muted">
              This can&apos;t be undone. Your profile, listings, messages, offers
              and saved items will all be removed.
            </p>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={status === "deleting"}
              className="mt-6 w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {status === "deleting" ? "Deleting…" : "Yes, delete my account"}
            </button>
            <a href="/" className="mt-3 block text-[13px] text-muted hover:underline">
              Cancel, keep my account
            </a>
            {status === "error" && (
              <p aria-live="polite" className="spec mt-3 text-deal">
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function ConfirmDeletePage() {
  return (
    <Suspense fallback={<main className="min-h-[55vh]" aria-busy="true" />}>
      <ConfirmDeleteContent />
    </Suspense>
  );
}
