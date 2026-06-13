import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo values for the foundation. Wired to Supabase session/wallet later.
  return (
    <AppShell walletPaise={245000} userName="Student" notifications={3}>
      {children}
    </AppShell>
  );
}
