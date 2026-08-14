import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { BRAND } from "@/lib/brand";

export const metadata = { title: `Sign in — ${BRAND.name}` };

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-[420px] px-4 py-24">Loading…</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
