export default function Loading() {
  return (
    <div className="mx-auto max-w-[1560px] px-4 py-8 lg:px-6">
      <div className="mb-6 h-9 w-56 rounded-lg bg-line" />
      <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
        <div className="hidden h-[420px] rounded-card bg-line/60 lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line bg-card">
              <div className="aspect-[4/3] rounded-t-[10px] bg-line/60" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-full rounded-lg bg-line" />
                <div className="h-3 w-2/3 rounded-lg bg-line" />
                <div className="h-5 w-20 rounded-lg bg-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
