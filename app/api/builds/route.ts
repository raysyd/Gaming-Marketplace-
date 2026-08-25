import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const MAX_PHOTOS = 10;

export async function POST(req: Request) {
  const limited = rateLimit(`builds:${clientKey(req)}`, { limit: 10 });
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many requests. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
    );

  const payload = await req.json();
  const title = String(payload.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "Give your build a title." }, { status: 400 });

  const photos = Array.isArray(payload.photos) ? payload.photos.slice(0, MAX_PHOTOS) : [];
  const specs = Array.isArray(payload.specs)
    ? payload.specs
        .filter((s: unknown): s is { label: string; value: string } =>
          Boolean(s && typeof s === "object" && "label" in s && "value" in s)
        )
        .slice(0, 30)
    : [];

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to post a build." }, { status: 401 });

  const { data, error } = await supabase
    .from("builds")
    .insert({
      user_id: user.id,
      title,
      description: String(payload.description ?? "").slice(0, 2000),
      photos,
      specs,
      fps_notes: String(payload.fpsNotes ?? "").slice(0, 1000),
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: true, persisted: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { error } = await supabase.from("builds").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
