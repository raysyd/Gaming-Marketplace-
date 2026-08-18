"use client";
import { useState } from "react";

export function ConnectPayoutButton({ connected }: { connected: boolean }) {
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

  return (
    <div>
      <button
        onClick={connect}
        disabled={busy}
        className="rgb-ring mt-3 rounded-md bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Connecting…" : connected ? "Finish payout setup" : "Connect payout account"}
      </button>
      {error && <p className="spec mt-2 text-deal">{error}</p>}
    </div>
  );
}
