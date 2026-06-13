import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Wallet balance/notifications are demo values until those modules are wired.
  return (
    <AppShell
      walletPaise={245000}
      userName={user?.name ?? "Student"}
      notifications={3}
    >
      {children}
    </AppShell>
  );
}
