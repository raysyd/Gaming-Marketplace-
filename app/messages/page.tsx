import { Suspense } from "react";
import { queryListings } from "@/lib/data";
import { queryMessengerData } from "@/lib/messages-data";
import { DEMO_CONVERSATIONS, DEMO_MESSAGES } from "@/lib/demo";
import { hasSupabase } from "@/lib/supabase/config";
import { Messenger } from "@/components/Messenger";

export default async function MessagesPage() {
  const { items: listings } = await queryListings({ perPage: 200 });

  // Demo mode has no backend to query at all, so it's the one case that
  // still seeds from fabricated data — everything else (signed in or not)
  // reads the real tables, even though a signed-out visitor will just see
  // an empty inbox from that query. See lib/messages-data.ts.
  const { conversations, messages } = hasSupabase
    ? await queryMessengerData()
    : { conversations: DEMO_CONVERSATIONS, messages: DEMO_MESSAGES };

  return (
    <Suspense
      fallback={<div className="mx-auto max-w-[1240px] px-4 py-16">Loading…</div>}
    >
      <Messenger
        initialConversations={conversations}
        initialMessages={messages}
        listings={listings}
      />
    </Suspense>
  );
}
