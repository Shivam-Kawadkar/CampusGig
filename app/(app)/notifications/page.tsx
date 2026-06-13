import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata = { title: "Notifications - CampusGig" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, payload, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Map to enforce type constraints
  const typedNotifications = (notifications || []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    payload: n.payload,
    is_read: n.is_read,
    created_at: n.created_at,
  }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-4">
      <FadeIn>
        <div className="flex items-center gap-2">
          <Bell className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          Keep track of proposal updates, messaging, and gig milestones.
        </p>
      </FadeIn>

      <NotificationsList notifications={typedNotifications} />
    </div>
  );
}
