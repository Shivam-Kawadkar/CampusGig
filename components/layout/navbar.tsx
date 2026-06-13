"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Wallet, User, Pencil, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { formatINR } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/client";

export function Navbar({
  walletPaise = 0,
  userName = "Student",
  notifications = 0,
  userId,
}: {
  walletPaise?: number;
  userName?: string;
  notifications?: number;
  userId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mobileSearch, setMobileSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [notifCount, setNotifCount] = React.useState(notifications);
  const ref = React.useRef<HTMLDivElement>(null);
  const mobileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync server-provided count on mount
  React.useEffect(() => {
    setNotifCount(notifications);
  }, [notifications]);

  // Real-time notification badge via Supabase Realtime
  React.useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`notif_badge_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // New notification inserted → increment badge
          setNotifCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // If a notification was marked read, re-fetch count
          if (payload.new && (payload.new as { is_read?: boolean }).is_read) {
            setNotifCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/tasks?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/tasks");
    }
    setMobileSearch(false);
    setSearchQuery("");
  }

  function toggleMobileSearch() {
    setMobileSearch((v) => !v);
    setTimeout(() => mobileInputRef.current?.focus(), 50);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <div className="lg:hidden">
          <Logo showText={false} />
        </div>

        {/* Global search — desktop */}
        <form onSubmit={handleSearch} className="relative ml-auto hidden max-w-md flex-1 sm:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            id="global-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, skills, people…"
            className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={toggleMobileSearch}
            aria-label="Search"
          >
            <Search className="size-5" />
          </Button>

        {/* Wallet chip */}
        <Link
          href="/wallet"
          className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 sm:flex hover:bg-muted/40 transition-colors"
        >
          <Wallet className="size-4 text-accent" />
          <span className="text-sm font-semibold tabular-nums">
            {formatINR(walletPaise)}
          </span>
        </Link>

        {/* Notifications */}
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link href="/notifications">
            <Bell className="size-5" />
            {notifCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Link>
        </Button>

        {/* Avatar dropdown */}
        <div ref={ref} className="relative">
          <button
            id="user-menu-btn"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full p-0.5 transition hover:ring-2 hover:ring-primary/30 focus:outline-none"
            aria-expanded={open}
          >
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarFallback className="text-sm font-bold">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border bg-card shadow-lift z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User info */}
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground">Student</p>
              </div>

              {/* Links */}
              <div className="p-1">
                {userId && (
                  <Link
                    href={`/profile/${userId}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <User className="size-4 text-muted-foreground" />
                    View Profile
                  </Link>
                )}
                <Link
                  href="/profile/edit"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Pencil className="size-4 text-muted-foreground" />
                  Edit Profile
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors sm:hidden"
                >
                  <Wallet className="size-4 text-muted-foreground" />
                  Wallet — {formatINR(walletPaise)}
                </Link>
              </div>

              <div className="border-t p-1">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile search slide-down */}
      {mobileSearch && (
        <div className="border-t bg-background px-4 py-3 sm:hidden animate-in slide-in-from-top-1 duration-150">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={mobileInputRef}
              id="mobile-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, skills, people…"
              className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-10 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
            />
            <button
              type="button"
              onClick={() => setMobileSearch(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
