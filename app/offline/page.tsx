import { BRAND } from "@/lib/brand";
import { UnpluggedArt } from "@/components/ui/Illustrations";

// Served by public/sw.js when a page navigation fails with no network
// and nothing cached to fall back to. Static, no data fetching — it has
// to render with zero network access.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-[560px] flex-col items-center justify-center px-4 py-16 text-center">
      <UnpluggedArt className="w-[190px]" />
      <p className="tag-label mt-6 text-trust">Offline</p>
      <h1 className="display mt-3 text-[clamp(30px,4vw,42px)]">No connection right now</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
        {BRAND.name} needs a connection for anything beyond what&apos;s
        already been loaded. Reconnect and try again.
      </p>
    </main>
  );
}
