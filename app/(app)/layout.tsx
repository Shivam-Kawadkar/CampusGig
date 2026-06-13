import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  let unreadNotificationsCount = 0;
  let walletPaise = 0;
  let avatarUrl: string | undefined;

  if (user) {
    const supabase = await createClient();

    // 1. Fetch unread notifications count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (count !== null) {
      unreadNotificationsCount = count;
    }

    // 2. Fetch actual wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (wallet) {
      walletPaise = Number(wallet.balance);
    }

    // 3. Fetch profile avatar
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    avatarUrl = profile?.avatar_url ?? user.avatarUrl;
  }

  return (
    <AppShell
      walletPaise={walletPaise}
      userName={user?.name ?? "Student"}
      notifications={unreadNotificationsCount}
      userId={user?.id}
      avatarUrl={avatarUrl}
    >
      {children}
    </AppShell>
  );
}

