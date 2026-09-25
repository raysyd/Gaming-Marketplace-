"use client";
import { Icon } from "./ui/Icon";
import { useState } from "react";
import { AvatarUploader } from "@/components/AvatarUploader";
import { BannerUploader } from "@/components/BannerUploader";
import { IdentityVerificationButton } from "@/components/IdentityVerificationButton";
import { AU_STATES } from "@/lib/au-states";

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
  sellerType: initialSellerType,
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
  sellerType: "private" | "business";
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
  const [sellerType, setSellerType] = useState(initialSellerType);
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
          sellerType,
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
    <section className="panel space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-line-strong pb-5">
        <div>
          <h2 className="display text-[24px]">Public profile</h2>
          <p className="mt-1 text-[13.5px] text-muted">What buyers see on your seller page and next to your listings.</p>
        </div>
        {verified ? (
          <span className="badge badge-green">
            <Icon name="shield" size={14} /> Verified seller
          </span>
        ) : (
          <IdentityVerificationButton />
        )}
      </div>

      <label className="block">
        <span className="label">Banner</span>
        <BannerUploader value={bannerUrl} onChange={setBannerUrl} />
        <p className="hint">Shown across the top of your public seller profile.</p>
      </label>

      <AvatarUploader value={avatarUrl} onChange={setAvatarUrl} fallback={email[0]?.toUpperCase() ?? "?"} />

      <label className="block">
        <span className="label">Display name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
          placeholder="e.g. Alex Chen"
          className="input"
        />
      </label>

      <label className="block">
        <span className="label">Bio</span>
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
          <span className="label">Suburb</span>
          <input
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Newtown"
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">State</span>
          <select value={state} onChange={(e) => setState(e.target.value)} className="input">
            <option value="">Select…</option>
            {AU_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="label">Seller type</span>
        <div className="flex flex-wrap gap-2">
          {(["private", "business"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 rounded-[10px] border border-line-strong bg-card px-3.5 py-2.5 text-[14px] font-medium transition has-[:checked]:border-ink has-[:checked]:bg-paper">
              <input
                type="radio"
                name="sellerType"
                checked={sellerType === t}
                onChange={() => setSellerType(t)}
                className="h-4 w-4"
              />
              {t === "private" ? "Private seller" : "Business seller"}
            </label>
          ))}
        </div>
        <p className="hint">
          Just tells buyers who they're dealing with — not tax advice, and not a
          verification of anything.
        </p>
      </div>

      <label className="block">
        <span className="label">Contact link (optional)</span>
        <input
          value={contactLink}
          onChange={(e) => setContactLink(e.target.value.slice(0, 300))}
          placeholder="https://discord.gg/… or your website"
          className="input"
        />
        <p className="hint">
          Shown as an outbound link on your public profile — must start with https://.
        </p>
      </label>

      <label className="block">
        <span className="label">Shipping &amp; returns note (optional)</span>
        <textarea
          value={policyNote}
          onChange={(e) => setPolicyNote(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Handling time, how you package things, your stance on returns…"
          className="input resize-y"
        />
        <p className="hint">
          Shown on your public profile and applies to every listing you sell.
        </p>
      </label>

      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-line-strong pt-5">
        <button
          onClick={save}
          disabled={status === "saving"}
          className="btn btn-primary"
        >
          {status === "saving" && <span className="spinner" aria-hidden="true" />}
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {status === "saved" && (
          <p className="rise inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-good" aria-live="polite">
            <Icon name="check-circle" size={16} /> Saved
          </p>
        )}
      </div>
    </section>
  );
}
