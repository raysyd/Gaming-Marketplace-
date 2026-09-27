import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin";

/** Close a report from /admin as resolved (acted on) or dismissed (nothing wrong). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();
  if (!["resolved", "dismissed"].includes(status))
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const { error } = await admin
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
