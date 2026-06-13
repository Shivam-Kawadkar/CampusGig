"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema, type OnboardingInput } from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Completes onboarding: validates input, saves profile, marks onboarding complete.
 * Email is already verified via Google OAuth — no additional OTP needed.
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

  // Store phone if provided (optional, no OTP verification required).
  if (phone) {
    await supabase
      .from("users")
      .update({ phone })
      .eq("id", user.id);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Sign out and return to the landing page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
