"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileUpdateResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(input: {
  fullName: string;
  bio: string;
  college: string;
  course: string;
  yearOfStudy: number;
  avatarUrl: string;
  skills: string[];
}): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  if (!input.fullName.trim()) return { ok: false, error: "Full name is required." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      bio: input.bio.trim() || null,
      college: input.college.trim() || null,
      course: input.course.trim() || null,
      year_of_study: input.yearOfStudy || null,
      avatar_url: input.avatarUrl.trim() || null,
      skills: input.skills,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
