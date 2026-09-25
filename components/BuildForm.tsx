"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoUploader } from "@/components/PhotoUploader";

/** Posting a build showcase — same spec-row and photo-upload patterns as
 * SellForm, much shorter: this isn't a sale, so no price/condition/
 * category/payout gating applies. */
export function BuildForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fpsNotes, setFpsNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [specs, setSpecs] = useState([{ label: "", value: "" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim()) {
      setError("Give your build a title.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          fpsNotes,
          photos,
          specs: specs.filter((s) => s.label && s.value),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/builds/${data.id}`);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't post that. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 panel p-6">
      <label className="block">
        <span className="label">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="My first ITX sleeper build"
          className="input"
        />
      </label>

      <label className="block">
        <span className="label">Photos</span>
        <PhotoUploader photos={photos} onChange={setPhotos} min={0} max={10} />
      </label>

      <label className="block">
        <span className="label">Description (optional)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder="What you built, why, anything you'd tell someone about to copy it."
          className="input resize-y"
        />
      </label>

      <label className="block">
        <span className="label">FPS / benchmark notes (optional)</span>
        <input
          value={fpsNotes}
          onChange={(e) => setFpsNotes(e.target.value.slice(0, 1000))}
          placeholder="e.g. 140fps avg at 1440p in Cyberpunk 2077, high settings"
          className="input"
        />
      </label>

      <div>
        <span className="label">Specs (optional)</span>
        <div className="space-y-2">
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={s.label}
                onChange={(e) => setSpecs((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="GPU"
                className="input w-1/3"
              />
              <input
                value={s.value}
                onChange={(e) => setSpecs((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                placeholder="RTX 4070 Ti 12GB"
                className="input flex-1"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSpecs((p) => [...p, { label: "", value: "" }])}
            className="spec rounded border border-line px-2.5 py-1.5 font-medium"
          >
            + Add spec
          </button>
        </div>
      </div>

      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || !title.trim()}
        className="btn btn-primary btn-block"
      >
        {busy ? "Posting…" : "Post build"}
      </button>
    </div>
  );
}
