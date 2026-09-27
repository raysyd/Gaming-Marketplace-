export default function Loading() {
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 lg:px-6" aria-busy="true" aria-label="Loading listings">
      <div className="skeleton mb-3 h-3 w-32 rounded-[3px]" />
      <div className="skeleton mb-6 h-10 w-64 rounded-[4px]" />
      <div className="hud-rule -mt-3 mb-6" aria-hidden="true" />
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <div className="skeleton hidden h-[460px] rounded-[6px] lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[6px] border border-line bg-card">
              <div className="skeleton aspect-[4/3]" />
              <div className="space-y-2.5 p-4">
                <div className="skeleton h-2.5 w-24 rounded-[2px]" />
                <div className="skeleton h-3 w-full rounded-[2px]" />
                <div className="skeleton h-3 w-2/3 rounded-[2px]" />
                <div className="skeleton h-5 w-20 rounded-[2px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
