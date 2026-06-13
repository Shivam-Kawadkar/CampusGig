import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { FadeIn } from "@/components/motion/fade-in";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "@/features/auth/components/onboarding-form";
import { getCurrentUser } from "@/lib/auth/user";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = { title: "Complete your profile — CampusGig" };

export default async function OnboardingPage() {
  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?redirect=/onboarding");
  }

  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <FadeIn className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight">
              Set up your profile
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tell us a bit about you so students can trust and find you.
            </p>
          </div>
          <OnboardingForm
            defaultName={user?.name}
            defaultEmail={user?.email}
          />
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step 1 of 1 · You can edit this anytime in your profile.
        </p>
      </FadeIn>
    </div>
  );
}
