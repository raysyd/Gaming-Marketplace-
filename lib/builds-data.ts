import { createPublicClient } from "./supabase/public";

export type Build = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  description: string;
  photos: string[];
  specs: { label: string; value: string }[];
  fpsNotes: string;
  createdAt: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToBuild(r: any): Build {
  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name ?? "A Sidegrade user",
    title: r.title,
    description: r.description ?? "",
    photos: r.photos ?? [],
    specs: r.specs ?? [],
    fpsNotes: r.fps_notes ?? "",
    createdAt: r.created_at,
  };
}

/** Same reason as lib/reviews-data.ts/lib/messages-data.ts: user_id
 * references auth.users, not profiles, so the author's name needs a
 * second lookup rather than an embed. */
async function withAuthorNames(rows: Record<string, unknown>[]) {
  const supabase = createPublicClient();
  if (!supabase || !rows.length) return rows.map((r) => rowToBuild({ ...r, author_name: null }));
  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  return rows.map((r) => rowToBuild({ ...r, author_name: nameById.get(r.user_id as string) }));
}

export async function listBuilds(limit = 24): Promise<Build[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return withAuthorNames(data);
}

export async function listBuildsByUser(userId: string): Promise<Build[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("builds")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return withAuthorNames(data);
}

export async function getBuild(id: string): Promise<Build | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("builds").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const [build] = await withAuthorNames([data]);
  return build;
}
