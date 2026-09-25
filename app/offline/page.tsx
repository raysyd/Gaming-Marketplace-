import { BRAND } from "@/lib/brand";

// Served by public/sw.js when a page navigation fails with no network
// and nothing cached to fall back to. Static, no data fetching — it has
// to render with zero network access.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-[480px] items-center px-4 py-16">
      <div className="w-full rounded-card border border-line bg-card p-6 text-center sm:p-8">
        <p className="eyebrow text-trust">Offline</p>
        <h1 className="display mt-2 text-3xl">No connection right now</h1>
        <p className="mt-2 text-sm text-muted">
          {BRAND.name} needs a connection for anything beyond what&apos;s
          already been loaded. Reconnect and try again.
        </p>
      </div>
    </main>
  );
}
