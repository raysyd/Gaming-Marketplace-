import { Suspense } from "react";
import { queryListings } from "@/lib/data";
import { DEMO_CONVERSATIONS, DEMO_MESSAGES } from "@/lib/demo";
import { Messenger } from "@/components/Messenger";

export default async function MessagesPage() {
  const { items: listings } = await queryListings({ perPage: 200 });
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-[1240px] px-4 py-16">Loading…</div>}
    >
      <Messenger
        initialConversations={DEMO_CONVERSATIONS}
        initialMessages={DEMO_MESSAGES}
        listings={listings}
      />
    </Suspense>
  );
}
