"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

// Kept in one place so the uploader, the /api/listings validation, and the
// Supabase Storage bucket's allowed MIME list can't drift from each other.
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function PhotoUploader({
  photos,
  onChange,
  min = 5,
  max = 10,
}: {
  photos: string[];
  onChange: (next: string[]) => void;
  min?: number;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");

    const incoming = Array.from(files);

    if (photos.length + incoming.length > max) {
      setError(`Only up to ${max} photos per listing — remove one first.`);
      return;
    }

    const wrongType = incoming.find((f) => !ALLOWED_PHOTO_TYPES.includes(f.type));
    if (wrongType) {
      setError(`${wrongType.name} isn't a JPG, PNG, WebP or GIF.`);
      return;
    }

    const tooBig = incoming.find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is over 8MB. Shrink it and try again.`);
      return;
    }

    const supabase = createClient();

    // No backend yet: preview locally so the form still works end to end.
    if (!hasSupabase || !supabase) {
      const previews = incoming.map((f) => URL.createObjectURL(f));
      onChange([...photos, ...previews]);
      setError(
        "Previewing locally — connect Supabase Storage to save photos permanently."
      );
      return;
    }

    setBusy(true);
    const uploaded: string[] = [];
    for (const file of incoming) {
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
            <Image src={src} alt="" fill sizes="96px" className="object-cover" />
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

        {photos.length < max && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="h-20 w-24 rounded border border-dashed border-line text-[12px] text-muted transition hover:border-ink/40 hover:text-ink disabled:opacity-50"
          >
            {busy ? "Uploading…" : "+ Add photos"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(e) => pick(e.target.files)}
        className="hidden"
      />

      <p className="spec mt-2 text-muted">
        {min}–{max} photos, JPG/PNG/WebP/GIF. Animated GIFs are fine.
        Photograph the actual unit — buyers skip listings that use press shots
        or stock photos. The first photo is what shows in search.
      </p>
      {error && <p className="text-[13px] font-medium text-danger mt-1">{error}</p>}
    </div>
  );
}
