export default function Loading() {
  return (
    <div className="mx-auto max-w-[1480px] px-4 pb-8 pt-8 lg:px-8 lg:pt-10" aria-busy="true" aria-label="Loading listings">
      <div className="mb-6 border-b border-line pb-6">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton mt-3 h-10 w-72" />
        <div className="skeleton mt-3 h-3 w-24" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[236px_1fr]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton h-4" style={{ width: `${55 + ((i * 37) % 40)}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="panel p-[7px]">
              <div className="skeleton aspect-[4/3] !rounded-[9px]" />
              <div className="space-y-2.5 p-2 pt-3">
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-2/3" />
                <div className="skeleton mt-3 h-6 w-24" />
                <div className="skeleton mt-3 h-2 w-full" />
                <div className="skeleton h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
