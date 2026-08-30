"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";

/**
 * Genuinely live — Supabase Realtime **Presence** (distinct from the
 * postgres_changes subscription components/Messenger.tsx uses, but the
 * same underlying Realtime service), one ephemeral channel per listing.
 * Never shows "1 person viewing" — that's just the visitor themselves,
 * and would read as a fabricated signal rather than a real one.
 */
export function ViewerCount({ listingId }: { listingId: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!hasSupabase) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase.channel(`presence:listing:${listingId}`, {
      config: { presence: { key: crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ at: new Date().toISOString() });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  if (count < 2) return null;
  return (
    <p className="spec mt-1 font-semibold text-deal">
      🔥 {count} people viewing this right now
    </p>
  );
}
