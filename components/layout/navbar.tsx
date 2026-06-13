"use client";

import { Bell, Search, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { formatINR } from "@/lib/utils";

export function Navbar({
  walletPaise = 0,
  userName = "Student",
  notifications = 0,
}: {
  walletPaise?: number;
  userName?: string;
  notifications?: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <div className="lg:hidden">
        <Logo showText={false} />
      </div>

      {/* Global search */}
      <div className="relative ml-auto hidden max-w-md flex-1 sm:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search tasks, skills, people…"
          className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
        />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        {/* Wallet chip */}
        <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 sm:flex">
          <Wallet className="size-4 text-accent" />
          <span className="text-sm font-semibold tabular-nums">
            {formatINR(walletPaise)}
          </span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {notifications > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </Button>

        {/* Avatar */}
        <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent transition hover:ring-primary/30">
          <AvatarFallback>
            {userName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
