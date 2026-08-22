import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = await searchParams;
  const next = safeNext(nextParam);
  const { supabase, user } = await getAuthedUser();

  if (!supabase || !user) redirect(`/login?next=/account/onboarding`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // Already set up — this page is a one-time step, not a destination.
  if (profile?.username) redirect(next);

  return <OnboardingForm next={next} email={user.email ?? ""} />;
}
