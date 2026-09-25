"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/config";
import { Icon } from "./ui/Icon";

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
    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-deal-soft px-2.5 py-1 text-[12.5px] font-semibold text-deal">
      <Icon name="flame" size={14} /> {count} people viewing this right now
    </p>
  );
}
