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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  // A real query error used to look identical to "hasn't onboarded yet"
  // below — surface it instead of quietly showing the onboarding form to
  // someone who already has a profile. See the matching check in
  // app/account/page.tsx.
  if (profileError) {
    console.error("Failed to load profile for /account/onboarding", profileError);
    throw new Error(`Couldn't load your profile: ${profileError.message}`);
  }

  // Already set up — this page is a one-time step, not a destination.
  if (profile?.username) redirect(next);

  return <OnboardingForm next={next} email={user.email ?? ""} />;
}
