"use client";
import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { passwordIssues } from "@/lib/password";
import { withTimeout } from "@/lib/timeout";

type Mode = "password" | "link";
type AuthAction = "signin" | "signup";
type Status = "idle" | "sending" | "sent" | "error" | "check-email";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const urlError = params.get("error");

  const [mode, setMode] = useState<Mode>("password");
  const [action, setAction] = useState<AuthAction>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setMessage("");
  }

  function switchAction(next: AuthAction) {
    setAction(next);
    setStatus("idle");
    setMessage("");
    setConfirmPassword("");
  }

  const submitPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    const issues = passwordIssues(password);
    if (issues.length) {
      setStatus("error");
      setMessage(`Password needs ${issues.join(", ")}.`);
      return;
    }
    if (action === "signup" && password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords don't match.");
      return;
    }

    const supabase = createClient("implicit");
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in isn't connected yet. Add your Supabase keys to switch it on.");
      return;
    }

    setStatus("sending");

    // A thrown network/fetch error here (slow connection, cold Supabase
    // project, DNS blip) used to leave the button stuck on "Sending…"
    // forever, since nothing downstream of an unhandled rejection ever
    // reset the status. withTimeout also catches the case where the
    // request doesn't reject at all — it just never comes back — so the
    // button is guaranteed to resolve one way or the other.
    try {
      if (action === "signin") {
        // Per-account lockout on top of Supabase's own IP-based auth rate
        // limits (see supabase/auth-security.sql). Fails open — if the
        // migration hasn't been run yet, the RPC errors and sign-in
        // proceeds as normal rather than blocking everyone.
        const { data: blocked } = await withTimeout(
          supabase
            .rpc("signin_attempts_blocked", { p_email: normalizedEmail })
            .then((res) => res, () => ({ data: false }))
        );
        if (blocked) {
          setStatus("error");
          setMessage("Too many failed attempts for this account. Try again in 15 minutes, or reset your password.");
          return;
        }

        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        );
        if (error) {
          supabase.rpc("record_failed_signin", { p_email: normalizedEmail }).then(
            () => {},
            () => {}
          );
          setStatus("error");
          setMessage(
            /invalid login credentials/i.test(error.message)
              ? "Wrong email or password."
              : error.message
          );
          return;
        }
        supabase.rpc("clear_signin_attempts", { p_email: normalizedEmail }).then(
          () => {},
          () => {}
        );
        router.replace(next);
        return;
      }

      // action === "signup"
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/complete?next=${encodeURIComponent(next)}`,
          },
        })
      );
      if (error) {
        setStatus("error");
        setMessage(
          /already registered|already exists/i.test(error.message)
            ? "An account already exists for that email. Try signing in instead."
            : error.message
        );
        return;
      }
      if (data.session) {
        // Email confirmation is off for this project — the account is live already.
        router.replace(next);
        return;
      }
      setStatus("check-email");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("taking too long")
          ? e.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
  };

  const sendMagicLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }
    if (cooldown > 0) return;
    const supabase = createClient("implicit");
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in isn't connected yet. Add your Supabase keys to switch it on.");
      return;
    }
    setStatus("sending");
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/complete?next=${encodeURIComponent(next)}`,
          },
        })
      );
      if (error) {
        setStatus("error");
        setMessage(
          /rate limit|too many|email/i.test(error.message)
            ? "Email delivery is temporarily limited. Wait a minute, then try again. If this continues, the site needs a custom SMTP provider."
            : error.message
        );
        return;
      }
      setStatus("sent");
      setCooldown(60);
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("taking too long")
          ? e.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
  };

  const forgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setStatus("error");
      setMessage("Enter your email above first, then tap “Forgot password”.");
      return;
    }
    const supabase = createClient("implicit");
    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in isn't connected yet. Add your Supabase keys to switch it on.");
      return;
    }
    setStatus("sending");
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })
      );
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("sent");
      setMessage("reset");
    } catch (e) {
      setStatus("error");
      setMessage(
        e instanceof Error && e.message.includes("taking too long")
          ? e.message
          : "Couldn't reach the server. Check your connection and try again."
      );
    }
  };

  const signInWithGoogle = async () => {
    const supabase = createClient("pkce");

    if (!supabase) {
      setStatus("error");
      setMessage("Sign-in is not configured.");
      return;
    }

    setStatus("sending");
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })
      );
      if (error) {
        setStatus("error");
        setMessage(error.message);
      }
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
    <div className="mx-auto w-full max-w-[420px] px-4 py-12 sm:py-24">
      <h1 className="display text-[28px]">
        {mode === "password" && action === "signup" ? `Create your ${BRAND.name} account` : `Sign in to ${BRAND.name}`}
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        {mode === "password"
          ? action === "signup"
            ? "Set a password so you can sign in on any device."
            : "Sign in with your email and password."
          : "We'll email you a one-time link. Open it on the device you want to sign in."}
      </p>

      {urlError && (
        <p className="spec mt-4 rounded border border-deal bg-deal-soft px-3 py-2 text-deal">
          Sign-in didn&apos;t complete: {urlError.replace(/_/g, " ")}. Try
          requesting a fresh link — they expire after an hour and only work once.
        </p>
      )}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={status === "sending"}
          className="w-full rounded-md border border-line bg-card py-3 text-[14px] font-semibold text-ink transition hover:border-trust disabled:opacity-50"
        >
          Continue with Google
        </button>
        <div className="flex items-center gap-3 py-1" aria-hidden="true">
          <span className="h-px flex-1 bg-line" />
          <span className="spec text-muted">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {mode === "password" && (
          <div className="grid grid-cols-2 gap-1 rounded-md border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => switchAction("signin")}
              className={`rounded py-2 text-[13px] font-semibold transition ${
                action === "signin" ? "bg-ink text-white" : "text-ink hover:bg-paper"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchAction("signup")}
              className={`rounded py-2 text-[13px] font-semibold transition ${
                action === "signup" ? "bg-ink text-white" : "text-ink hover:bg-paper"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {status === "check-email" ? (
          <div className="rounded-[10px] border border-good/40 bg-card p-5">
            <p className="text-[14px] font-semibold text-good">Check your inbox</p>
            <p className="mt-1 text-[13.5px] text-muted">
              We sent a confirmation link to {email.trim().toLowerCase()}. Open it
              to activate your account, then come back and sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                switchAction("signin");
              }}
              className="mt-4 rounded-md border border-line px-3 py-2 text-[13px] font-semibold"
            >
              Back to sign in
            </button>
          </div>
        ) : mode === "link" && status === "sent" && message !== "reset" ? (
          <div className="rounded-[10px] border border-good/40 bg-card p-5">
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
                onClick={sendMagicLink}
                disabled={cooldown > 0}
                className="rounded-md bg-ink px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setCooldown(0);
                }}
                className="rounded-md border border-line px-3 py-2 text-[13px] font-semibold"
              >
                Use another email
              </button>
            </div>
          </div>
        ) : status === "sent" && message === "reset" ? (
          <div className="rounded-[10px] border border-good/40 bg-card p-5">
            <p className="text-[14px] font-semibold text-good">Check your inbox</p>
            <p className="mt-1 text-[13.5px] text-muted">
              We sent a password reset link to {email.trim().toLowerCase()}. Open
              it on this device to set a new password.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-4 rounded-md border border-line px-3 py-2 text-[13px] font-semibold"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (mode === "password") submitPassword();
                else sendMagicLink();
              }}
              type="email"
              autoComplete="email"
              enterKeyHint={mode === "password" ? "next" : "send"}
              placeholder="you@example.com"
              className="input"
            />

            {mode === "password" && (
              <>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                    type={showPassword ? "text" : "password"}
                    autoComplete={action === "signup" ? "new-password" : "current-password"}
                    enterKeyHint={action === "signup" ? "next" : "send"}
                    placeholder="Password"
                    className="input pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted hover:text-ink"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {action === "signup" && (
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    enterKeyHint="send"
                    placeholder="Confirm password"
                    className="input"
                  />
                )}

                {action === "signin" && (
                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-[13px] text-trust hover:underline"
                  >
                    Forgot password?
                  </button>
                )}

                <button
                  onClick={submitPassword}
                  disabled={status === "sending"}
                  className="rgb-ring w-full rounded-md bg-ink py-3 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  {status === "sending"
                    ? action === "signup"
                      ? "Creating account…"
                      : "Signing in…"
                    : action === "signup"
                      ? "Create account"
                      : "Sign in"}
                </button>
              </>
            )}

            {mode === "link" && (
              <button
                onClick={sendMagicLink}
                disabled={status === "sending"}
                className="w-full rounded-md bg-ink py-3 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Email me a link"}
              </button>
            )}

            {status === "error" && (
              <p aria-live="polite" className="spec text-deal">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={() => switchMode(mode === "password" ? "link" : "password")}
              className="w-full text-center text-[13px] text-trust hover:underline"
            >
              {mode === "password" ? "Use an email link instead" : "Use a password instead"}
            </button>
          </div>
        )}
      </div>

      <p className="spec mt-6 text-muted">
        <Link href="/shop" className="text-trust hover:underline">
          Keep browsing
        </Link>{" "}
        — you only need an account to buy or sell.
      </p>
    </div>
  );
}
