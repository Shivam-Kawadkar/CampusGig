import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";

export default async function ProfileIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Redirect to the current user's profile detail page
  redirect(`/profile/${user.id}`);
}
