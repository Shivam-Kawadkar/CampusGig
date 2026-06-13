"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Completes onboarding: validates input, updates the user's profile + phone,
 * marks onboarding complete. (Phone OTP verification is a follow-up step;
 * for now the phone is stored and flagged when a provider is wired.)
 */
export async function completeOnboarding(
  input: OnboardingInput
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const { fullName, college, course, yearOfStudy, phone } = parsed.data;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      college,
      course,
      year_of_study: yearOfStudy,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const { error: userError } = await supabase
    .from("users")
    .update({ phone })
    .eq("id", user.id);

  if (userError) return { ok: false, error: userError.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Sign out and return to the landing page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
