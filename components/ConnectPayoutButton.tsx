"use client";
import { useState } from "react";

export function ConnectPayoutButton({
  status,
}: {
  status: "none" | "pending" | "active" | "unknown";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Couldn't start onboarding. Try again.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  };

  if (status === "active")
    return <p className="spec mt-3 font-semibold text-good">✓ Payouts active</p>;

  return (
    <div>
      <button
        onClick={connect}
        disabled={busy}
        className="btn btn-dark btn-sm mt-3"
      >
        {busy ? "Connecting…" : status === "pending" ? "Finish payout setup" : "Connect payout account"}
      </button>
      {error && <p className="text-[13px] font-medium text-danger mt-2">{error}</p>}
    </div>
  );
}
