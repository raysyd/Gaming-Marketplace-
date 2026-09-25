"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

export function AvatarUploader({
  value,
  onChange,
  fallback,
}: {
  value: string;
  onChange: (url: string) => void;
  /** Initial letter shown when there's no photo yet. */
  fallback: string;
}) {
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
      setError("Image is over 4MB. Shrink it and try again.");
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
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-trust">
        {value ? (
          <Image src={value} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-xl font-semibold text-white">
            {fallback}
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn btn-secondary btn-sm"
        >
          {busy ? "Uploading…" : value ? "Change photo" : "Add photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pick(e.target.files)}
          className="hidden"
        />
        {error && <p className="spec mt-1.5 text-deal">{error}</p>}
      </div>
    </div>
  );
}
