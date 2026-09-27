import { createClient } from "@/lib/supabase/server";

/**
 * Who can open /admin: the accounts whose email is listed in ADMIN_EMAILS
 * (comma-separated). An env var, not a database flag, so nobody can grant
 * themselves admin through a table they can write to. Unset = no admins.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** The signed-in user if they're an admin, otherwise null. getUser() (not claims) — this guards money. */
export async function getAdminUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
