export default function Loading() {
  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-8 pt-8 lg:px-8" aria-busy="true" aria-label="Loading listing">
      <div className="skeleton mb-6 h-3 w-60" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <div className="skeleton aspect-[4/3] w-full !rounded-[16px]" />
          <div className="mt-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/3] !rounded-[10px]" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-9 w-full" />
          <div className="skeleton h-9 w-3/4" />
          <div className="rounded-[14px] border border-line bg-card p-5">
            <div className="skeleton h-10 w-40" />
            <div className="skeleton mt-4 h-3 w-2/3" />
            <div className="skeleton mt-6 h-[52px] w-full !rounded-[12px]" />
            <div className="skeleton mt-2 h-[44px] w-full !rounded-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
