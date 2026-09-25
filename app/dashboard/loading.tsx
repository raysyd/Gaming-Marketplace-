export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1560px] px-4 lg:px-6 py-10">
      <div className="h-3 w-24 skeleton" />
      <div className="mt-2 h-9 w-48 skeleton" />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[74px] panel" />
        ))}
      </div>

      <div className="mt-8 h-7 w-32 skeleton" />
      <div className="mt-3 h-64 panel" />
    </div>
  );
}
