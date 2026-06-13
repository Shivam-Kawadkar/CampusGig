import * as React from "react";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { BottomNav } from "./bottom-nav";

export function AppShell({
  children,
  walletPaise,
  userName,
  notifications,
  userId,
  avatarUrl,
}: {
  children: React.ReactNode;
  walletPaise?: number;
  userName?: string;
  notifications?: number;
  userId?: string;
  avatarUrl?: string;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          walletPaise={walletPaise}
          userName={userName}
          notifications={notifications}
          userId={userId}
          avatarUrl={avatarUrl}
        />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
