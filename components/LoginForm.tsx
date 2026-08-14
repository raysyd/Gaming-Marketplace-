"use client";
import { useState } from "react";
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

  const signIn = async () => {
    if (!email.includes("@")) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
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
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
  };

  return (
    <div className="mx-auto max-w-[420px] px-4 py-24">
      <h1 className="display text-[28px]">Sign in to {BRAND.name}</h1>
      <p className="mt-2 text-[14px] text-muted">
        We&apos;ll email you a link. No password to remember.
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
            The link goes to {email} and expires in an hour.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            type="email"
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
          {state === "error" && <p className="spec text-deal">{message}</p>}
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
