"use client";
import { useState } from "react";
import { AvatarUploader } from "@/components/AvatarUploader";
import { IdentityVerificationButton } from "@/components/IdentityVerificationButton";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

/**
 * Everything here is editable at any time except username — there's no
 * username field on this form at all, on purpose (see
 * app/account/onboarding and supabase/07-profiles.sql's immutability
 * trigger, which is the actual enforcement).
 */
export function AccountSettingsForm({
  avatarUrl: initialAvatar,
  bio: initialBio,
  suburb: initialSuburb,
  state: initialState,
  verified,
  email,
}: {
  avatarUrl: string;
  bio: string;
  suburb: string;
  state: string;
  verified: boolean;
  email: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [bio, setBio] = useState(initialBio);
  const [suburb, setSuburb] = useState(initialSuburb);
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const save = async () => {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl, bio, suburb, state }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save. Try again.");
      setStatus("error");
    }
  };

  return (
    <div className="mt-6 space-y-5 rounded-[10px] border border-line bg-card p-6">
      {verified ? (
        <p className="spec inline-block w-fit rounded bg-trust-soft px-2 py-1 font-semibold text-trust">
          ✓ Verified seller
        </p>
      ) : (
        <IdentityVerificationButton />
      )}

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} fallback={email[0]?.toUpperCase() ?? "?"} />

      <label className="block">
        <span className="eyebrow mb-1.5 block">Bio</span>
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
          <span className="eyebrow mb-1.5 block">Suburb</span>
          <input
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Newtown"
            className="input"
          />
        </label>
        <label className="block">
          <span className="eyebrow mb-1.5 block">State</span>
          <select value={state} onChange={(e) => setState(e.target.value)} className="input">
            <option value="">Select…</option>
            {AU_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="spec text-deal">{error}</p>}
      {status === "saved" && <p className="spec font-semibold text-good">Saved.</p>}

      <button
        onClick={save}
        disabled={status === "saving"}
        className="rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-chrome-2 disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
