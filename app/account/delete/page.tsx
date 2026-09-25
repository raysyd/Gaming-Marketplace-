"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { withTimeout } from "@/lib/timeout";

export default function DeleteAccountPage() {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const sendConfirmation = async () => {
    if (!user) return;
    const supabase = createClient("implicit");
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in is not configured.");
      return;
    }
    setStatus("sending");
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: user.email,
          options: {
            emailRedirectTo: `${window.location.origin}/account/delete/confirm`,
          },
        })
      );
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("taking too long")
          ? e.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
  };

  if (loading) return <main className="min-h-[55vh]" aria-busy="true" />;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
        <div className="w-full panel p-6 text-center sm:p-8">
          <p className="text-[14px] text-muted">Sign in to manage account deletion.</p>
          <a href="/login?next=/account/delete" className="btn btn-dark mt-4">
            Sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
      <div className="w-full panel p-6 sm:p-8">
        <p className="eyebrow text-danger">Danger zone</p>
        <h1 className="display mt-2 text-[26px]">Delete your account</h1>
        <p className="mt-3 text-[14px] text-muted">
          This permanently deletes your {BRAND.name} account — your profile,
          listings, messages, offers and saved items. It can&apos;t be undone.
          Accounts with order history can&apos;t be deleted this way; contact{" "}
          {BRAND.supportEmail} instead.
        </p>
        <p className="mt-3 text-[14px] text-muted">
          To confirm it&apos;s really you, we&apos;ll email a link to{" "}
          <strong>{user.email}</strong>. Opening it won&apos;t delete anything by
          itself — it takes you to a final confirmation step.
        </p>

        {status === "sent" ? (
          <div className="mt-5 rounded-[10px] border border-good/40 bg-paper p-4">
            <p className="text-[14px] font-semibold text-good">Check your inbox</p>
            <p className="mt-1 text-[13.5px] text-muted">
              Open the link on this device to finish deleting your account.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={sendConfirmation}
            disabled={status === "sending"}
            className="btn btn-outline mt-5 btn-block !text-danger"
          >
            {status === "sending" ? "Sending…" : "Email me a confirmation link"}
          </button>
        )}
        {status === "error" && (
          <p aria-live="polite" className="text-[13px] font-medium text-danger mt-3">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
