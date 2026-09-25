export default function OnboardingLoading() {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-16">
      <div className="h-3 w-32 skeleton" />
      <div className="mt-2 h-9 w-64 skeleton" />
      <div className="mt-3 h-4 w-72 skeleton" />
      <div className="mt-8 h-[420px] panel" />
    </main>
  );
}
