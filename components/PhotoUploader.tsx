"use client";
import { useRef, useState } from "react";
import { Icon } from "./ui/Icon";
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
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {photos.map((src, i) => (
          <div
            key={src + i}
            className="rise group relative aspect-[4/3] overflow-hidden rounded-[10px] border border-line bg-chrome"
          >
            <Image src={src} alt={`Photo ${i + 1}`} fill sizes="160px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, j) => j !== i))}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 !min-h-0 place-items-center rounded-full bg-[#17150f]/80 text-white opacity-90 transition hover:bg-danger hover:opacity-100"
            >
              <Icon name="x" size={14} strokeWidth={2.4} />
            </button>
            {i === 0 && (
              <span className="sticker absolute bottom-1.5 left-1.5 !text-[10px]">Cover</span>
            )}
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed border-line-strong bg-paper text-[12.5px] font-semibold text-muted transition hover:border-ink hover:text-ink disabled:opacity-50"
          >
            {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="camera" size={22} />}
            {busy ? "Uploading…" : "Add photos"}
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

      <p className="hint">
        {min}–{max} photos, JPG/PNG/WebP/GIF. Animated GIFs are fine.
        Photograph the actual unit — buyers skip listings that use press shots
        or stock photos. The first photo is what shows in search.
      </p>
      {error && <p className="text-[13px] font-medium text-danger mt-1">{error}</p>}
    </div>
  );
}
