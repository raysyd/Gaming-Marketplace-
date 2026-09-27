import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser, isAdminEmail } from "@/lib/admin";
import { revalidateTag } from "next/cache";

/**
 * Suspend or restore an account from /admin. Suspending bans the user in
 * Supabase Auth (they can't sign in or refresh a session) and takes their
 * active listings down to "removed", which RLS hides from everyone else.
 * Orders already in escrow are left alone for support to settle one by one.
 * Restoring lifts the ban; listings stay down for the seller to relist.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await params;
  const { action } = await req.json();
  if (!["suspend", "restore"].includes(action))
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (id === adminUser.id) return NextResponse.json({ error: "You can't suspend yourself." }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: target } = await admin.auth.admin.getUserById(id);
  if (!target.user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (isAdminEmail(target.user.email))
    return NextResponse.json({ error: "Remove them from ADMIN_EMAILS first." }, { status: 400 });

  const suspend = action === "suspend";
  const { error: banError } = await admin.auth.admin.updateUserById(id, {
    ban_duration: suspend ? "876000h" : "none",
  });
  if (banError) return NextResponse.json({ error: banError.message }, { status: 500 });

  await admin.from("profiles").update({ suspended_at: suspend ? new Date().toISOString() : null }).eq("id", id);
  if (suspend) {
    await admin.from("listings").update({ status: "removed" }).eq("seller_id", id).eq("status", "active");
    revalidateTag("listings", { expire: 0 });
  }

  console.info(`[admin] ${adminUser.email} ${action} user ${id}`);
  return NextResponse.json({ ok: true });
}
