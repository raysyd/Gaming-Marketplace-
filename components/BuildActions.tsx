"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function BuildActions({ id, ownerId }: { id: string; ownerId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (user?.id !== ownerId) return null;

  const remove = async () => {
    if (!window.confirm("Take this build down? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/builds?id=${id}`, { method: "DELETE" });
    if (res.ok) router.push("/builds");
    setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="btn btn-outline btn-sm"
    >
      {busy ? "Removing…" : "Take down"}
    </button>
  );
}
