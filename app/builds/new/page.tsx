import { BuildForm } from "@/components/BuildForm";

export default function NewBuildPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <p className="eyebrow">Community</p>
      <h1 className="display mt-2 text-[28px]">Post your build</h1>
      <p className="mt-2 text-[14px] text-muted">
        Show off a finished setup — this isn&apos;t a listing, nothing here is for sale.
      </p>
      <div className="mt-6">
        <BuildForm />
      </div>
    </div>
  );
}
