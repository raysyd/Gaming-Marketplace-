"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { REPORT_REASONS } from "@/lib/reports";

/** "Report this listing" / "Report this seller" — a small inline form that files a row in `reports` for /admin. */
export function ReportButton({
  listingId,
  userId,
  label,
}: {
  listingId?: string;
  userId?: string;
  label: string;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) return <p className="spec text-muted">Thanks. Our team will review it.</p>;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          if (!user) {
            window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
            return;
          }
          setOpen(true);
        }}
        className="spec text-muted underline-offset-2 hover:text-deal hover:underline"
      >
        {label}
      </button>
    );

  const submit = async () => {
    if (!reason) {
      setError("Pick a reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, userId, reason, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't send that.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  };

  return (
    <div className="w-full rounded-lg border border-line bg-paper p-3">
      <p className="eyebrow">{label}</p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="input mt-2 w-full text-sm"
        aria-label="Reason"
      >
        <option value="">Choose a reason…</option>
        {REPORT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Anything that helps us check it (optional)"
        className="input mt-2 w-full resize-y text-sm"
        aria-label="Details"
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
      {error && <p className="spec mt-2 text-deal">{error}</p>}
    </div>
  );
}
