import { notFound, redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { FadeIn } from "@/components/motion/fade-in";
import { ProfileEditForm } from "@/features/profile/components/profile-edit-form";

export const metadata = {
  title: "Edit Profile | CampusGig",
  description: "Update your name, bio, skills, and academic details",
};

export default async function ProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, bio, college, course, year_of_study, avatar_url, skills")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">
              Your public profile is visible to all students on CampusGig
            </p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <ProfileEditForm
            userId={user.id}
            defaultValues={{
              fullName: profile.full_name ?? "",
              bio: profile.bio ?? "",
              college: profile.college ?? "",
              course: profile.course ?? "",
              yearOfStudy: profile.year_of_study ?? 1,
              avatarUrl: profile.avatar_url ?? "",
              skills: (profile.skills as string[]) ?? [],
            }}
          />
        </div>
      </FadeIn>
    </div>
  );
}
