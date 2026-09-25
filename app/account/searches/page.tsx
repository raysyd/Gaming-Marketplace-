import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { listSavedSearches, savedSearchHref } from "@/lib/saved-searches-data";
import { SavedSearchRow } from "@/components/SavedSearchRow";

export default async function SavedSearchesPage() {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) redirect("/login?next=/account/searches");

  const searches = await listSavedSearches();

  return (
    <main className="mx-auto max-w-[720px] px-4 py-12 lg:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-2 text-[clamp(30px,4vw,42px)]">Saved searches</h1>
      <p className="mt-2 text-[14px] text-muted">
        You&apos;ll get an email when a new listing matches one of these — save a
        search from any filtered view on{" "}
        <Link href="/shop" className="inline-link">
          the marketplace
        </Link>
        .
      </p>

      {searches.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No saved searches yet"
          body="Filter the shop down to what you're after, then hit “Alert me to new matches”."
          action={<Link href="/shop" className="btn btn-dark">Browse listings</Link>}
        />
      ) : (
        <ul className="mt-6 space-y-2">
          {searches.map((s) => (
            <SavedSearchRow key={s.id} id={s.id} label={s.label} href={savedSearchHref(s.query)} />
          ))}
        </ul>
      )}
    </main>
  );
}
