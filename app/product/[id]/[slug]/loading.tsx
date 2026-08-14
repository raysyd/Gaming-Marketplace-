export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[4/3] w-full rounded-[10px] bg-line/60" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded bg-line/60" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-7 w-3/4 rounded bg-line" />
          <div className="h-7 w-1/2 rounded bg-line" />
          <div className="h-[280px] rounded-[10px] bg-line/60" />
        </div>
      </div>
    </div>
  );
}
