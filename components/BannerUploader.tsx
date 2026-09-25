"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 6 * 1024 * 1024;

/** Same upload shape as AvatarUploader, pointed at the "banners" bucket (see supabase/11-profile-extras.sql) — a wide rectangular image instead of a circular one, so it's its own component rather than a mode flag on that one. */
export function BannerUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is over 6MB. Shrink it and try again.");
      return;
    }

    const supabase = createClient();
    if (!hasSupabase || !supabase) {
      onChange(URL.createObjectURL(file));
      setError("Previewing locally — connect Supabase Storage to save this permanently.");
      return;
    }

    setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("banners")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div>
      <div className="relative h-28 w-full overflow-hidden rounded-lg bg-trust-soft sm:h-36">
        {value && <Image src={value} alt="" fill sizes="(max-width: 640px) 100vw, 640px" className="object-cover" />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn btn-secondary btn-sm"
        >
          {busy ? "Uploading…" : value ? "Change banner" : "Add banner"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pick(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="spec mt-1.5 text-deal">{error}</p>}
    </div>
  );
}
