"use client";
import { useState } from "react";
import { AvatarUploader } from "@/components/AvatarUploader";
import { BannerUploader } from "@/components/BannerUploader";
import { IdentityVerificationButton } from "@/components/IdentityVerificationButton";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

/**
 * Everything here is editable at any time except username — there's no
 * username field on this form at all, on purpose (see
 * app/account/onboarding and supabase/07-profiles.sql's immutability
 * trigger, which is the actual enforcement).
 */
export function AccountSettingsForm({
  displayName: initialDisplayName,
  avatarUrl: initialAvatar,
  bannerUrl: initialBanner,
  bio: initialBio,
  suburb: initialSuburb,
  state: initialState,
  contactLink: initialContactLink,
  policyNote: initialPolicyNote,
  verified,
  email,
}: {
  displayName: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  suburb: string;
  state: string;
  contactLink: string;
  policyNote: string;
  verified: boolean;
  email: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [bannerUrl, setBannerUrl] = useState(initialBanner);
  const [bio, setBio] = useState(initialBio);
  const [suburb, setSuburb] = useState(initialSuburb);
  const [state, setState] = useState(initialState);
  const [contactLink, setContactLink] = useState(initialContactLink);
  const [policyNote, setPolicyNote] = useState(initialPolicyNote);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const save = async () => {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          avatarUrl,
          bannerUrl,
          bio,
          suburb,
          state,
          contactLink,
          policyNote,
        }),
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

      <label className="block">
        <span className="eyebrow mb-1.5 block">Banner</span>
        <BannerUploader value={bannerUrl} onChange={setBannerUrl} />
        <p className="spec mt-1.5 text-muted">Shown across the top of your public seller profile.</p>
      </label>

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} fallback={email[0]?.toUpperCase() ?? "?"} />

      <label className="block">
        <span className="eyebrow mb-1.5 block">Display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder="e.g. Alex Chen"
          className="input"
        />
      </label>

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

      <label className="block">
        <span className="eyebrow mb-1.5 block">Contact link (optional)</span>
        <input
          value={contactLink}
          onChange={(e) => setContactLink(e.target.value.slice(0, 300))}
          placeholder="https://discord.gg/… or your website"
          className="input"
        />
        <p className="spec mt-1.5 text-muted">
          Shown as an outbound link on your public profile — must start with https://.
        </p>
      </label>

      <label className="block">
        <span className="eyebrow mb-1.5 block">Shipping &amp; returns note (optional)</span>
        <textarea
          value={policyNote}
          onChange={(e) => setPolicyNote(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Handling time, how you package things, your stance on returns…"
          className="input resize-y"
        />
        <p className="spec mt-1.5 text-muted">
          Shown on your public profile and applies to every listing you sell.
        </p>
      </label>

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
