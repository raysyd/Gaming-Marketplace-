import { createPublicClient } from "./supabase/public";

export type Profile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  suburb: string | null;
  state: string | null;
  contactLink: string | null;
  policyNote: string | null;
  verified: boolean;
  /** "active" is the only value that means anything is granted — see lib/premium.ts. */
  premiumStatus: string | null;
};

function rowToProfile(r: Record<string, unknown>): Profile {
  return {
    id: r.id as string,
    displayName: (r.display_name as string) ?? null,
    username: (r.username as string) ?? null,
    avatarUrl: (r.avatar_url as string) ?? null,
    bannerUrl: (r.banner_url as string) ?? null,
    bio: (r.bio as string) ?? null,
    suburb: (r.suburb as string) ?? null,
    state: (r.state as string) ?? null,
    contactLink: (r.contact_link as string) ?? null,
    policyNote: (r.policy_note as string) ?? null,
    verified: Boolean(r.verified),
    premiumStatus: (r.premium_status as string) ?? null,
  };
}

/** Read-only lookup for public display (seller profile pages, listings). */
export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, avatar_url, banner_url, bio, suburb, state, contact_link, policy_note, verified, premium_status"
    )
    .eq("id", id)
    .maybeSingle();
  return data ? rowToProfile(data) : null;
}
