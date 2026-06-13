import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet,
  Trophy,
  Briefcase,
  Star,
  Plus,
  Search,
  MessageSquare,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Bell,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { FadeIn } from "@/components/motion/fade-in";
import { StatCard } from "@/components/shared/stat-card";
import { TaskCard } from "@/components/shared/task-card";
import { demoTasks } from "@/lib/demo-data";
import type { TaskSummary } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";

import { refreshLeaderboard } from "@/features/leaderboard/actions";

interface DashboardPageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const role = params.role === "hire" ? "hire" : "work";
  const supabase = await createClient();

  // 1. Fetch wallet data
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, locked_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const walletBalance = wallet?.balance ? Number(wallet.balance) : 0;
  const lockedBalance = wallet?.locked_balance ? Number(wallet.locked_balance) : 0;

  // 1b. Fetch earnings this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: completedTasksThisMonth } = await supabase
    .from("tasks")
    .select("budget")
    .eq("selected_worker_id", user.id)
    .eq("status", "completed")
    .gte("updated_at", startOfMonth.toISOString());

  const earnedThisMonth = completedTasksThisMonth
    ? completedTasksThisMonth.reduce((acc, curr) => acc + Number(curr.budget), 0)
    : 0;

  // 1c. Fetch campus rank
  const { data: leaderboardEntry } = await supabase
    .from("leaderboard")
    .select("rank")
    .eq("user_id", user.id)
    .eq("period", "all_time")
    .is("category", null)
    .maybeSingle();

  const campusRank = leaderboardEntry?.rank || 0;

  // 2. Fetch Notifications/Recent Activity
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, type, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(4);

  // 3. Role-based dynamic logic
  let activeTasksCount = 0;
  let statsCards = null;

  if (role === "work") {
    // WORKER ROLE DATA
    // Fetch active task count (assigned to user, or user has pending proposal)
    const { count: activeWorkerTasks } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("selected_worker_id", user.id)
      .in("status", ["in_progress", "submitted", "disputed"]);

    const { count: pendingProposals } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("worker_id", user.id)
      .eq("status", "pending");

    activeTasksCount = (activeWorkerTasks ?? 0) + (pendingProposals ?? 0);

    statsCards = (
      <>
        <StatCard
          label="Wallet balance"
          value={walletBalance}
          formatType="inr"
          icon={<Wallet className="size-5" />}
          accent="accent"
        />
        <StatCard
          label="Earned this month"
          value={earnedThisMonth}
          formatType="inr"
          icon={<Star className="size-5" />}
          accent="primary"
          hint="From completed gigs"
        />
        <StatCard
          label="Active gigs & bids"
          value={activeTasksCount}
          icon={<Briefcase className="size-5" />}
          accent="secondary"
        />
        <StatCard
          label="Campus rank"
          value={campusRank}
          formatType="rank"
          icon={<Trophy className="size-5" />}
          accent="warning"
          hint={campusRank > 0 ? "Global campus ranking" : "No ranking yet"}
        />
      </>
    );
  } else {
    // POSTER ROLE DATA
    // Fetch total posted tasks
    const { count: totalPosted } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("poster_id", user.id);

    // Fetch active hired contracts
    const { count: activeHired } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("poster_id", user.id)
      .in("status", ["in_progress", "submitted", "disputed"]);

    // Fetch open listings
    const { count: openListings } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("poster_id", user.id)
      .eq("status", "open");

    statsCards = (
      <>
        <StatCard
          label="Escrow held"
          value={lockedBalance}
          formatType="inr"
          icon={<Wallet className="size-5" />}
          accent="accent"
        />
        <StatCard
          label="Total gigs posted"
          value={totalPosted ?? 0}
          icon={<Briefcase className="size-5" />}
          accent="primary"
        />
        <StatCard
          label="Hired contracts"
          value={activeHired ?? 0}
          icon={<Star className="size-5" />}
          accent="secondary"
        />
        <StatCard
          label="Open listings"
          value={openListings ?? 0}
          icon={<Trophy className="size-5" />}
          accent="warning"
        />
      </>
    );
  }

  // 4. Fetch Recommended Gigs (for Worker view)
  let recommendedTasks: TaskSummary[] = [];
  if (role === "work") {
    const { data: openTasksData } = await supabase
      .from("tasks")
      .select(`
        id,
        poster_id,
        title,
        description,
        budget,
        deadline,
        status,
        skills,
        proposal_count,
        created_at,
        category:categories(name, slug)
      `)
      .eq("status", "open")
      .neq("poster_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (openTasksData && openTasksData.length > 0) {
      const posterIds = [...new Set(openTasksData.map((r) => r.poster_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, college, rating_avg, rating_count")
        .in("user_id", posterIds);

      const byId = new Map(profiles?.map((p) => [p.user_id, p]));

      recommendedTasks = openTasksData.map((r) => {
        const cat = r.category as unknown as { name: string; slug: string } | null;
        return {
          id: r.id,
          title: r.title,
          category: cat || { name: "General", slug: "general" },
          budget: Number(r.budget),
          deadline: r.deadline,
          status: r.status,
          skills: r.skills || [],
          proposalCount: r.proposal_count || 0,
          poster: {
            id: r.poster_id,
            name: byId.get(r.poster_id)?.full_name || "Student",
            avatarUrl: byId.get(r.poster_id)?.avatar_url || undefined,
            college: byId.get(r.poster_id)?.college || "—",
            ratingAvg: byId.get(r.poster_id)?.rating_avg || 0,
            ratingCount: byId.get(r.poster_id)?.rating_count || 0,
          },
        };
      });
    }
  }

  const showDemo = role === "work" && recommendedTasks.length === 0;
  const tasks = showDemo ? demoTasks.slice(0, 3) : recommendedTasks;

  // 5. Fetch Poster Gigs (for Hire view)
  interface PosterTask {
    id: string;
    title: string;
    budget: number;
    status: string;
    deadline: string;
    proposal_count: number;
    category: { name: string; slug: string } | null;
  }
  let posterGigs: PosterTask[] = [];
  if (role === "hire") {
    const { data: myTasks } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        budget,
        status,
        deadline,
        proposal_count,
        category:categories(name, slug)
      `)
      .eq("poster_id", user.id)
      .in("status", ["open", "in_progress", "submitted"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (myTasks) {
      posterGigs = myTasks.map(t => ({
        id: t.id,
        title: t.title,
        budget: Number(t.budget),
        status: t.status,
        deadline: t.deadline,
        proposal_count: t.proposal_count,
        category: t.category as unknown as { name: string; slug: string } | null
      }));
    }
  }

  // 6. Fetch Top Campus Giggers (Leaderboard Preview)
  const { data: rawTopGiggers } = await supabase
    .from("leaderboard")
    .select("user_id, rank, performance_score")
    .eq("period", "all_time")
    .is("category", null)
    .order("rank", { ascending: true })
    .limit(3);

  let topGiggers = [];
  if (rawTopGiggers && rawTopGiggers.length > 0) {
    const topUserIds = rawTopGiggers.map((e) => e.user_id);
    const { data: topProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, college")
      .in("user_id", topUserIds);
    
    const profileMap = new Map(topProfiles?.map((p) => [p.user_id, p]));
    topGiggers = rawTopGiggers.map((e) => {
      const p = profileMap.get(e.user_id);
      return {
        id: e.user_id,
        rank: e.rank || 0,
        name: p?.full_name || "Student",
        college: p?.college || "—",
        score: Number(e.performance_score).toFixed(1),
        badge: e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : "🎖️",
      };
    });
  } else {
    // Fallback if leaderboard is empty
    topGiggers = [
      { id: "fallback-1", rank: 1, name: "Rohan Sharma", college: "IIT Delhi", score: "98.2", badge: "🥇" },
      { id: "fallback-2", rank: 2, name: "Priya Patel", college: "BITS Pilani", score: "94.5", badge: "🥈" },
      { id: "fallback-3", rank: 3, name: "Aman Verma", college: "Delhi University", score: "91.8", badge: "🥉" }
    ];
  }

  return (
    <div className="space-y-8">
      {/* Header and Switcher */}
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening on your campus today.
            </p>
          </div>
          
          {/* Role Switcher tabs */}
          <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1 border shadow-inner">
            <Link
              href="/dashboard?role=work"
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                role === "work"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Work (Find Gigs)
            </Link>
            <Link
              href="/dashboard?role=hire"
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200",
                role === "hire"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Hire (Post Gigs)
            </Link>
          </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards}
      </div>

      {/* Quick Actions Panel */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {role === "work" ? (
            <>
              <Link 
                href="/tasks" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:scale-105 transition-transform">
                    <Search className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      Browse Gigs
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Explore open jobs on campus</p>
                  </div>
                </div>
              </Link>
              <Link 
                href="/chat" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2 text-secondary group-hover:scale-105 transition-transform">
                    <MessageSquare className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      Chat Inbox
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Coordinate details with clients</p>
                  </div>
                </div>
              </Link>
              <Link 
                href="/notifications" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2 text-accent group-hover:scale-105 transition-transform">
                    <Bell className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      Notifications
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Check recent system updates</p>
                  </div>
                </div>
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/tasks/new" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:scale-105 transition-transform">
                    <Plus className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      Post a Gig
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Hire fellow students for work</p>
                  </div>
                </div>
              </Link>
              <Link 
                href="/tasks" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/10 p-2 text-secondary group-hover:scale-105 transition-transform">
                    <Briefcase className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      My Listings
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Manage gigs you have posted</p>
                  </div>
                </div>
              </Link>
              <Link 
                href="/wallet" 
                className="group relative overflow-hidden rounded-xl border p-4 bg-card hover:shadow-soft transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2 text-accent group-hover:scale-105 transition-transform">
                    <Wallet className="size-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-none flex items-center gap-1">
                      Manage Escrow
                      <ArrowUpRight className="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">View ledger and lock balances</p>
                  </div>
                </div>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Feed + Sidebar */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column (Feed) */}
        <div className="space-y-6 lg:col-span-2">
          {role === "work" ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {showDemo ? "Recommended for you (Sample)" : "Recommended for you"}
                </h2>
                <span className="text-xs text-muted-foreground">Based on active campus tasks</span>
              </div>
              
              {tasks.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center bg-card shadow-soft">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Briefcase className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No recommended tasks</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
                    There are no open tasks posted by other students at the moment. Try checking the marketplace or check back later!
                  </p>
                  <div className="mt-4">
                    <Link href="/tasks" className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/95 transition-colors">
                      Browse All Tasks
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Posted Gigs</h2>
                <span className="text-xs text-muted-foreground">Track active listings and hires</span>
              </div>

              {posterGigs.length > 0 ? (
                <div className="space-y-4">
                  {posterGigs.map((task) => {
                    const statusColors: Record<string, string> = {
                      open: "bg-warning/15 text-warning-foreground",
                      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                      submitted: "bg-accent/15 text-accent-foreground",
                      completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                    };
                    return (
                      <div 
                        key={task.id} 
                        className="group relative overflow-hidden rounded-xl border p-4 bg-card shadow-sm hover:shadow-soft transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide capitalize",
                                statusColors[task.status] ?? "bg-muted text-foreground"
                              )}>
                                {task.status.replace("_", " ")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {task.category?.name ?? "General"}
                              </span>
                            </div>
                            
                            <Link href={`/tasks/${task.id}`} className="mt-2 block">
                              <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-1">
                                {task.title}
                              </h3>
                            </Link>

                            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                              Budget: <span className="font-semibold text-accent">{formatINR(task.budget)}</span>
                              {task.deadline && (
                                <> · Deadline: <span className="font-medium">{new Date(task.deadline).toLocaleDateString("en-IN")}</span></>
                              )}
                            </p>
                          </div>
                          
                          <Link 
                            href={`/tasks/${task.id}`}
                            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </div>

                        {task.status === "open" && task.proposal_count > 0 && (
                          <Link 
                            href={`/tasks/${task.id}`}
                            className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-[11px] hover:bg-primary/10 transition-colors"
                          >
                            <span className="font-semibold text-primary flex items-center gap-1.5">
                              <AlertCircle className="size-3.5 shrink-0" />
                              {task.proposal_count} worker {task.proposal_count === 1 ? 'bid' : 'bids'} received!
                            </span>
                            <span className="text-primary hover:underline font-semibold flex items-center gap-0.5 shrink-0">
                              Review &rarr;
                            </span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center bg-card shadow-soft">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Plus className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No tasks posted</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
                    You haven&apos;t posted any gigs yet. Hire fellow students for coding, design, writing, and tutoring!
                  </p>
                  <div className="mt-4">
                    <Link href="/tasks/new" className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/95 transition-colors">
                      Post Your First Gig
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">Recent Activity</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Live
              </span>
            </div>

            {notifications && notifications.length > 0 ? (
              <div className="space-y-3.5">
                {notifications.map((notif) => {
                  let badgeColor = "bg-muted text-muted-foreground";
                  let icon = "🔔";

                  if (notif.type.startsWith("proposal_accepted")) {
                    badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
                    icon = "🎉";
                  } else if (notif.type === "proposal_rejected") {
                    badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400";
                    icon = "✉️";
                  } else if (notif.type === "new_proposal") {
                    badgeColor = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400";
                    icon = "🤝";
                  } else if (notif.type === "message") {
                    badgeColor = "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400";
                    icon = "💬";
                  }

                  return (
                    <div key={notif.id} className="flex gap-3 text-xs">
                      <div className={cn("size-6 rounded-full flex items-center justify-center shrink-0 text-sm", badgeColor)}>
                        {icon}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold leading-tight">{notif.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{notif.body}</p>
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          {new Date(notif.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="border-t pt-3">
                  <Link href="/notifications" className="block text-center text-xs font-semibold text-primary hover:underline">
                    View all notifications &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No recent activity. All notifications and updates will show up here.
              </div>
            )}
          </div>

          {/* Campus Leaderboard Preview */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">Top Campus Giggers</h2>
              <TrendingUp className="size-4 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              {topGiggers.map((gigger, index) => (
                <div key={`${gigger.id || 'gigger'}-${gigger.rank}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{gigger.badge}</span>
                    <div>
                      <p className="font-semibold">{gigger.name}</p>
                      <p className="text-[10px] text-muted-foreground">{gigger.college}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-accent">{gigger.score}</p>
                    <p className="text-[9px] text-muted-foreground">Rating score</p>
                  </div>
                </div>
              ))}

              <div className="border-t pt-3">
                <Link href="/leaderboard" className="block text-center text-xs font-semibold text-primary hover:underline">
                  View Full Leaderboard &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
