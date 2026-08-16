"use client";
import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const urlError = params.get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const signIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (cooldown > 0) return;
    const supabase = createClient();
    if (!supabase) {
      setState("error");
      setMessage(
        "Sign-in isn't connected yet. Add your Supabase keys to switch it on."
      );
      return;
    }
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/complete?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setState("error");
      setMessage(
        /rate limit|too many|email/i.test(error.message)
          ? "Email delivery is temporarily limited. Wait a minute, then try again. If this continues, the site needs a custom SMTP provider."
          : error.message
      );
      return;
    }
    setState("sent");
    setCooldown(60);
  };

  const signInWithGoogle = async () => {
    const supabase = createClient();

    if (!supabase) {
      setState("error");
      setMessage("Sign-in is not configured.");
      return;
    }

    setState("sending");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/complete?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setState("error");
      setMessage(error.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 py-12 sm:py-24">
      <h1 className="display text-[28px]">Sign in to {BRAND.name}</h1>
      <p className="mt-2 text-[14px] text-muted">
        We&apos;ll email you a one-time link. Open it on the device you want to sign in.
      </p>

      {urlError && (
        <p className="spec mt-4 rounded border border-deal bg-deal-soft px-3 py-2 text-deal">
          Sign-in didn&apos;t complete: {urlError.replace(/_/g, " ")}. Try
          requesting a fresh link — they expire after an hour and only work once.
        </p>
      )}

      {state === "sent" ? (
        <div className="mt-6 rounded-[10px] border border-good/40 bg-card p-5">
          <p className="text-[14px] font-semibold text-good">Check your inbox</p>
          <p className="mt-1 text-[13.5px] text-muted">
            The link goes to {email.trim().toLowerCase()} and works once.
          </p>
          <p className="spec mt-3 text-muted">
            To sign in on your laptop, open this email on your laptop instead of
            your phone. One link cannot create two sessions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={signIn}
              disabled={cooldown > 0}
              className="rounded-md bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setState("idle");
                setCooldown(0);
              }}
              className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold"
            >
              Use another email
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={state === "sending"}
            className="w-full rounded-md border border-line bg-card py-3 text-[14px] font-semibold text-ink transition hover:border-trust disabled:opacity-50"
          >
            Continue with Google
          </button>
          <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="spec text-muted">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            type="email"
            autoComplete="email"
            enterKeyHint="send"
            placeholder="you@example.com"
            className="input"
          />
          <button
            onClick={signIn}
            disabled={state === "sending"}
            className="w-full rounded-md bg-ink py-3 text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Email me a link"}
          </button>
          {state === "error" && (
            <p aria-live="polite" className="spec text-deal">
              {message}
            </p>
          )}
        </div>
      )}

      <p className="spec mt-6 text-muted">
        <Link href="/shop" className="text-trust hover:underline">
          Keep browsing
        </Link>{" "}
        — you only need an account to buy or sell.
      </p>
    </div>
  );
}
