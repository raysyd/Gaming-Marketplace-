"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

export function PhotoUploader({
  photos,
  onChange,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");

    const tooBig = Array.from(files).find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is over 8MB. Shrink it and try again.`);
      return;
    }

    const supabase = createClient();

    // No backend yet: preview locally so the form still works end to end.
    if (!hasSupabase || !supabase) {
      const previews = Array.from(files).map((f) => URL.createObjectURL(f));
      onChange([...photos, ...previews]);
      setError(
        "Previewing locally — connect Supabase Storage to save photos permanently."
      );
      return;
    }

    setBusy(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    onChange([...photos, ...uploaded]);
    setBusy(false);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <div
            key={src + i}
            className="relative h-20 w-24 overflow-hidden rounded border border-line bg-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label="Remove photo"
              className="spec absolute right-0 top-0 bg-ink px-1.5 py-0.5 text-white"
            >
              ×
            </button>
            {i === 0 && (
              <span className="spec absolute bottom-0 left-0 bg-deal px-1 text-white">
                Main
              </span>
            )}
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-20 w-24 rounded border border-dashed border-line text-[12px] text-muted transition hover:border-ink/40 hover:text-ink disabled:opacity-50"
        >
          {busy ? "Uploading…" : "+ Add photos"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => pick(e.target.files)}
        className="hidden"
      />

      <p className="spec mt-2 text-muted">
        Photograph the actual unit — buyers skip listings that use press shots.
        The first photo is what shows in search.
      </p>
      {error && <p className="spec mt-1 text-deal">{error}</p>}
    </div>
  );
}
