import { Suspense } from "react";
import { queryListings } from "@/lib/data";
import { queryMessengerData, queryMessengerListings } from "@/lib/messages-data";
import { DEMO_CONVERSATIONS, DEMO_MESSAGES } from "@/lib/demo";
import { hasSupabase } from "@/lib/supabase/config";
import { Messenger } from "@/components/Messenger";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing: deepListing } = await searchParams;

  // Demo mode has no backend to query at all, so it's the one case that
  // still seeds from fabricated data. Signed-out visitors never get here —
  // proxy.ts sends them to /login first.
  if (!hasSupabase) {
    const { items: listings } = await queryListings({ perPage: 200 });
    return (
      <Suspense fallback={<MessagesFallback />}>
        <Messenger initialConversations={DEMO_CONVERSATIONS} initialMessages={DEMO_MESSAGES} listings={listings} />
      </Suspense>
    );
  }

  const { conversations, messages } = await queryMessengerData();
  const listings = await queryMessengerListings(conversations, deepListing);

  return (
    <Suspense fallback={<MessagesFallback />}>
      <Messenger
        initialConversations={conversations}
        initialMessages={messages}
        listings={listings}
      />
    </Suspense>
  );
}

function MessagesFallback() {
  return <div className="mx-auto max-w-[1560px] px-4 py-16 lg:px-6">Loading…</div>;
}
