"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function useAdminPost() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const post = async (url: string, body: object, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "That didn't work.");
      else router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
    setBusy(false);
  };
  return { busy, error, post };
}

const btn = "spec rounded-lg border border-line px-2.5 py-1.5 font-medium transition disabled:opacity-50";

export function AdminOrderActions({ id, status, chargeback }: { id: string; status: string; chargeback: string | null }) {
  const { busy, error, post } = useAdminPost();
  const canRelease = ["paid", "shipped", "awaiting_confirmation", "disputed"].includes(status) && (!chargeback || chargeback === "won");
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => post(`/api/admin/orders/${id}`, { action: "refund" }, "Refund the buyer for this order?")}
          className={`${btn} hover:border-deal hover:text-deal`}
        >
          Refund buyer
        </button>
        {canRelease && (
          <button
            type="button"
            disabled={busy}
            onClick={() => post(`/api/admin/orders/${id}`, { action: "release" }, "Release this payment to the seller?")}
            className={`${btn} border-good text-good hover:bg-good hover:text-white`}
          >
            Release to seller
          </button>
        )}
      </div>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}

export function AdminReportActions({ id }: { id: string }) {
  const { busy, error, post } = useAdminPost();
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button type="button" disabled={busy} onClick={() => post(`/api/admin/reports/${id}`, { status: "dismissed" }, "Dismiss this report?")} className={btn}>
          Dismiss
        </button>
        <button type="button" disabled={busy} onClick={() => post(`/api/admin/reports/${id}`, { status: "resolved" }, "Mark this report resolved?")} className={btn}>
          Resolved
        </button>
      </div>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}

export function AdminUserActions({ id, suspended }: { id: string; suspended: boolean }) {
  const { busy, error, post } = useAdminPost();
  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          post(
            `/api/admin/users/${id}`,
            { action: suspended ? "restore" : "suspend" },
            suspended ? "Restore this account?" : "Suspend this account? They're signed out and their listings come down."
          )
        }
        className={`${btn} ${suspended ? "" : "hover:border-deal hover:text-deal"}`}
      >
        {suspended ? "Restore account" : "Suspend account"}
      </button>
      {error && <p className="spec text-deal">{error}</p>}
    </div>
  );
}
