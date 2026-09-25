"use client";
import { useState } from "react";

export function IdentityVerificationButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/identity", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Couldn't start the identity check. Try again.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    }
    setBusy(false);
  };

  return (
    <div>
      <button
        onClick={start}
        disabled={busy}
        className="btn btn-secondary btn-sm"
      >
        {busy ? "Starting…" : "Verify identity with Stripe"}
      </button>
      {error && <p className="spec mt-2 text-deal">{error}</p>}
    </div>
  );
}
