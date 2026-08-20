"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";

type Factor = { id: string; friendly_name?: string; status: string };

/**
 * Supabase's own TOTP MFA (auth.mfa.*) — enrol, verify, unenrol. There's
 * no separate "recovery codes" primitive in Supabase's MFA API to hand
 * out here; the honest mitigation is enrolling a second authenticator
 * (Supabase supports multiple factors per user) rather than this page
 * pretending to generate backup codes that don't actually work anywhere.
 * Losing every enrolled device means contacting support to unenrol via
 * the admin API — same as any TOTP-only setup without a recovery flow.
 */
export default function SecuritySettingsPage() {
  const { user, loading } = useAuth();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshFactors = async () => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  };

  useEffect(() => {
    if (user) refreshFactors();
  }, [user]);

  const startEnroll = async () => {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `${BRAND.name} — ${new Date().toLocaleDateString()}`,
    });
    setBusy(false);
    if (enrollError || !data) {
      setError(enrollError?.message ?? "Couldn't start enrolment.");
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyEnroll = async () => {
    const supabase = createClient();
    if (!supabase || !enrolling) return;
    setBusy(true);
    setError("");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrolling.factorId,
    });
    if (challengeError || !challenge) {
      setBusy(false);
      setError(challengeError?.message ?? "Couldn't verify that code.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setEnrolling(null);
    setCode("");
    setNotice("Two-factor authentication is on.");
    refreshFactors();
  };

  const removeFactor = async (factorId: string) => {
    if (!window.confirm("Turn off two-factor authentication for this account?")) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    setNotice("Two-factor authentication turned off.");
    refreshFactors();
  };

  if (loading) return <main className="min-h-[55vh]" aria-busy="true" />;

  if (!user)
    return (
      <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
        <div className="w-full rounded-[10px] border border-line bg-card p-6 text-center sm:p-8">
          <p className="text-[14px] text-muted">Sign in to manage account security.</p>
          <Link
            href="/login?next=/account/security"
            className="mt-4 inline-block rounded-md bg-ink px-5 py-3 text-[14px] font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );

  const verifiedFactor = factors?.find((f) => f.status === "verified") ?? null;

  return (
    <main className="mx-auto max-w-[560px] px-4 py-16">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-2 text-[28px]">Two-factor authentication</h1>
      <p className="mt-2 text-[14px] text-muted">
        Optional for buyers. Required before connecting a payout account as a
        seller — see{" "}
        <Link href="/selling#payouts" className="text-trust hover:underline">
          Payouts
        </Link>
        .
      </p>

      {notice && <p className="spec mt-4 font-semibold text-good">{notice}</p>}
      {error && <p className="spec mt-4 text-deal">{error}</p>}

      {factors === null ? null : verifiedFactor ? (
        <div className="mt-6 rounded-[10px] border border-good/40 bg-card p-5">
          <p className="text-[14px] font-semibold text-good">✓ Enabled</p>
          <p className="mt-1 text-[13.5px] text-muted">
            {verifiedFactor.friendly_name ?? "Authenticator app"} is protecting sign-in.
          </p>
          <button
            type="button"
            onClick={() => removeFactor(verifiedFactor.id)}
            disabled={busy}
            className="mt-4 rounded-md border border-deal px-4 py-2 text-[13px] font-semibold text-deal transition hover:bg-deal-soft disabled:opacity-50"
          >
            Turn off
          </button>
        </div>
      ) : enrolling ? (
        <div className="mt-6 rounded-[10px] border border-line bg-card p-5">
          <p className="text-[14px] font-semibold">Scan this in your authenticator app</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="TOTP QR code" className="mt-3 h-44 w-44" />
          <p className="spec mt-2 text-muted">
            Can&apos;t scan it? Enter this key manually:{" "}
            <code className="rounded bg-paper px-1.5 py-0.5">{enrolling.secret}</code>
          </p>
          <label htmlFor="totp-code" className="eyebrow mt-4 block">
            6-digit code
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="totp-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="input w-32"
            />
            <button
              type="button"
              onClick={verifyEnroll}
              disabled={busy || code.length !== 6}
              className="rounded-md bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Confirm"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setEnrolling(null)}
            className="spec mt-3 text-muted underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="mt-6 rounded-md bg-ink px-5 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Starting…" : "Enable two-factor authentication"}
        </button>
      )}

      <p className="spec mt-8 border-t border-line pt-4 text-muted">
        No separate recovery codes — if you lose access to your authenticator,
        contact {BRAND.supportEmail} to verify your identity and reset it.
        Enrolling a second device as backup is the more reliable option.
      </p>
    </main>
  );
}
