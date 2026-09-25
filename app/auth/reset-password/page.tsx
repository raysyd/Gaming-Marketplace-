"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { passwordIssues } from "@/lib/password";
import { withTimeout } from "@/lib/timeout";

function ResetPasswordContent() {
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "done">("idle");
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
        setLinkError(
          error?.message ?? "This reset link is invalid or has expired."
        );
      }
      setChecking(false);
    });
  }, []);

  const submit = async () => {
    const issues = passwordIssues(password);
    if (issues.length) {
      setStatus("error");
      setMessage(`Password needs ${issues.join(", ")}.`);
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords don't match.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in is not configured.");
      return;
    }
    setStatus("saving");
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password }));
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("done");
      // Hard navigation, not router.replace() — see the note in
      // LoginForm.tsx for why.
      setTimeout(() => {
        window.location.href = "/buying";
      }, 1500);
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("taking too long")
          ? e.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
  };

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[420px] items-center px-4 py-16">
      <div className="w-full panel p-6 sm:p-8">
        {checking ? (
          <p className="text-center text-[14px] text-muted">Checking your link…</p>
        ) : linkError ? (
          <div className="text-center">
            <p className="eyebrow text-danger">Reset link unavailable</p>
            <h1 className="display mt-2 text-[clamp(30px,4vw,42px)]">Request a fresh link</h1>
            <p className="mt-3 text-[14px] text-muted">{linkError}</p>
            <p className="spec mt-3 text-muted">
              Reset links are single-use and only work on the device that
              requested them. Request a new one from the sign-in page.
            </p>
            <a
              href="/login"
              className="btn btn-dark mt-6"
            >
              Return to {BRAND.name} sign in
            </a>
          </div>
        ) : status === "done" ? (
          <div className="text-center">
            <p className="eyebrow text-good">Password updated</p>
            <h1 className="display mt-2 text-[clamp(30px,4vw,42px)]">You&apos;re all set</h1>
            <p className="mt-3 text-[14px] text-muted">Taking you to your dashboard…</p>
          </div>
        ) : (
          <>
            <h1 className="display text-[clamp(30px,4vw,42px)]">Set a new password</h1>
            <p className="mt-2 text-[14px] text-muted">
              Choose a new password for your {BRAND.name} account.
            </p>
            <div className="mt-5 space-y-3">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                aria-label="New password"
                className="input"
              />
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                aria-label="Confirm new password"
                className="input"
              />
              <button
                onClick={submit}
                disabled={status === "saving"}
                className="btn btn-primary btn-block"
              >
                {status === "saving" ? "Saving…" : "Save password"}
              </button>
              {status === "error" && (
                <p aria-live="polite" className="text-[13px] font-medium text-danger">
                  {message}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-[55vh]" aria-busy="true" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
