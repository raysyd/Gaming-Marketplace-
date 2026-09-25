export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-[1100px] animate-pulse px-4 py-10">
      <div className="h-9 w-40 rounded bg-line" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 panel" />
        ))}
      </div>
    </div>
  );
}
