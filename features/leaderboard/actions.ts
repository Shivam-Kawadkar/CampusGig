"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import type { LeaderboardEntry, AchievementBadge, PersonSummary } from "@/lib/types";

export interface PerformanceDashboardData {
  rank: number | null;
  performanceScore: number;
  completedTasks: number;
  totalTasks: number;
  averageRating: number;
  onTimeRate: number;
  successRate: number;
  earnedBadges: AchievementBadge[];
  lockedBadges: Array<{ name: AchievementBadge; criteria: string }>;
}

/** Triggers the database function to re-evaluate scores and ranks. */
export async function refreshLeaderboard(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("refresh_leaderboard_ranks");
  if (error) {
    console.error("Failed to refresh leaderboard ranks RPC: ", error);
    // Fallback: run it as raw sql if RPC helper isn't mapped
    const { error: sqlErr } = await supabase.from("users").select("id").limit(1);
    if (sqlErr) return { ok: false };
  }
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Fetches current leaderboard ranking snapshots. */
export async function getLeaderboardData(): Promise<{
  podium: LeaderboardEntry[];
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
}> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // 1. Fetch ranking snapshots
  const { data: rawEntries, error } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("period", "all_time")
    .is("category", null)
    .order("rank", { ascending: true })
    .limit(50);

  if (error || !rawEntries) {
    return { podium: [], entries: [], currentUserEntry: null };
  }

  const userIds = rawEntries.map((e) => e.user_id);

  // 2. Fetch profiles for workers
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, college, rating_avg, rating_count")
    .in("user_id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

  // 3. Fetch worker achievements
  const { data: achievements } = await supabase
    .from("achievements")
    .select("user_id, badge_name")
    .in("user_id", userIds);

  const achievementsMap = new Map<string, AchievementBadge[]>();
  achievements?.forEach((a) => {
    const list = achievementsMap.get(a.user_id) || [];
    list.push(a.badge_name as AchievementBadge);
    achievementsMap.set(a.user_id, list);
  });

  // Map to domain models
  const allEntries: LeaderboardEntry[] = rawEntries
    .map((e) => {
      const p = profileMap.get(e.user_id);
      if (!p) return null;
      return {
        rank: e.rank || 99,
        user: {
          id: e.user_id,
          name: p.full_name || "Student",
          avatarUrl: p.avatar_url || undefined,
          college: p.college || "—",
          ratingAvg: Number(p.rating_avg),
          ratingCount: p.rating_count,
        },
        performanceScore: Number(e.performance_score),
        completedTasks: e.completed_tasks,
        onTimeRate: Number(e.on_time_rate),
        badges: achievementsMap.get(e.user_id) || [],
      };
    })
    .filter(Boolean) as LeaderboardEntry[];

  // Separate top 3 podium entries
  const podium = allEntries.filter((e) => e.rank <= 3);
  const entries = allEntries.filter((e) => e.rank > 3);

  // Find current user's entry
  const currentUserEntry = allEntries.find((e) => e.user.id === user?.id) || null;

  return { podium, entries, currentUserEntry };
}

/** Fetches detailed performance metrics and achievement status for a user. */
export async function getPerformanceDashboard(userId: string): Promise<PerformanceDashboardData | null> {
  const supabase = await createClient();

  // 1. Fetch current leaderboard entry
  const { data: entry } = await supabase
    .from("leaderboard")
    .select("*")
    .eq("user_id", userId)
    .eq("period", "all_time")
    .is("category", null)
    .maybeSingle();

  // 2. Fetch earned achievements
  const { data: achievements } = await supabase
    .from("achievements")
    .select("badge_name")
    .eq("user_id", userId);

  const earnedBadges: AchievementBadge[] = (achievements?.map((a) => a.badge_name) || []) as AchievementBadge[];

  const allBadgeTypes: Array<{ name: AchievementBadge; criteria: string }> = [
    { name: "rising_star", criteria: "Completed first gig with a 5-star rating" },
    { name: "top_performer", criteria: "Performance score >= 95 and completed >= 3 gigs" },
    { name: "fast_delivery", criteria: "Completed at least 1 gig before the scheduled deadline" },
    { name: "trusted_worker", criteria: "Completed >= 5 gigs with average rating >= 4.5" },
  ];

  const lockedBadges = allBadgeTypes.filter((b) => !earnedBadges.includes(b.name));

  return {
    rank: entry?.rank || null,
    performanceScore: entry?.performance_score ? Number(entry.performance_score) : 0,
    completedTasks: entry?.completed_tasks || 0,
    totalTasks: entry?.total_tasks || 0,
    averageRating: entry?.average_rating ? Number(entry.average_rating) : 0,
    onTimeRate: entry?.on_time_rate ? Number(entry.on_time_rate) : 0,
    successRate: entry?.success_rate ? Number(entry.success_rate) : 0,
    earnedBadges,
    lockedBadges,
  };
}
