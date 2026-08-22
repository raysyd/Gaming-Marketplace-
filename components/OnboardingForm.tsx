"use client";
import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { AvatarUploader } from "@/components/AvatarUploader";
import { isValidUsername } from "@/lib/validation";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export function OnboardingForm({ next, email }: { next: string; email: string }) {
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const usernameValid = isValidUsername(username);

  const submit = async () => {
    if (!usernameValid) {
      setError("Username must be 3-20 characters: lowercase letters, numbers, underscores.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarUrl, bio, suburb, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Hard navigation, same reason as the rest of the auth flow — the
      // pages this can send you on (e.g. /sell) read the fresh profile
      // server-side, not from anything cached client-side here.
      window.location.href = next;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-[560px] px-4 py-16">
      <p className="eyebrow">Welcome to {BRAND.name}</p>
      <h1 className="display mt-2 text-[28px]">Set up your profile</h1>
      <p className="mt-2 text-[14px] text-muted">
        Signed in as {email}. This is what buyers and sellers see when they
        deal with you — it takes a minute.
      </p>

      <div className="mt-8 space-y-5 rounded-[10px] border border-line bg-card p-6">
        <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} fallback={email[0]?.toUpperCase() ?? "?"} />

        <label className="block">
          <span className="eyebrow mb-1.5 block">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="e.g. rtx_rayan"
            className="input"
            maxLength={20}
          />
          <p className="spec mt-1.5 text-muted">
            Permanent — this can&apos;t be changed later, so it stays a reliable way to
            find your history on the platform. Lowercase letters, numbers and
            underscores, 3-20 characters.
          </p>
        </label>

        <label className="block">
          <span className="eyebrow mb-1.5 block">Bio (optional)</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="What you sell, what you're into — a couple of sentences."
            className="input resize-y"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow mb-1.5 block">Suburb (optional)</span>
            <input
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="Newtown"
              className="input"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1.5 block">State (optional)</span>
            <select value={state} onChange={(e) => setState(e.target.value)} className="input">
              <option value="">Select…</option>
              {AU_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="spec text-deal">{error}</p>}

        <button
          onClick={submit}
          disabled={busy || !usernameValid}
          className="w-full rounded-md bg-deal py-3 text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
