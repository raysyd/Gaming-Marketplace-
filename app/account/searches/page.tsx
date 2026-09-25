import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { listSavedSearches, savedSearchHref } from "@/lib/saved-searches-data";
import { SavedSearchRow } from "@/components/SavedSearchRow";

export default async function SavedSearchesPage() {
  const { supabase, user } = await getAuthedUser();
  if (!supabase || !user) redirect("/login?next=/account/searches");

  const searches = await listSavedSearches();

  return (
    <main className="mx-auto max-w-[640px] px-4 py-12">
      <p className="eyebrow">Account</p>
      <h1 className="display mt-2 text-3xl">Saved searches</h1>
      <p className="mt-2 text-sm text-muted">
        You&apos;ll get an email when a new listing matches one of these — save a
        search from any filtered view on{" "}
        <Link href="/shop" className="text-trust hover:underline">
          the marketplace
        </Link>
        .
      </p>

      {searches.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No saved searches yet.</p>
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
