import Link from "next/link";
import { Trophy, Award, Briefcase, Star, Search, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/user";
import { getLeaderboardData, refreshLeaderboard } from "@/features/leaderboard/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { initials } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import type { LeaderboardEntry } from "@/lib/types";


const badgeDisplay: Record<string, { label: string; icon: string; color: string }> = {
  rising_star: { label: "Rising Star", icon: "🚀", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400" },
  top_performer: { label: "Top Performer", icon: "🔥", color: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400" },
  fast_delivery: { label: "Speed Demon", icon: "⚡", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400" },
  trusted_worker: { label: "Vetted Pro", icon: "🛡️", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" },
};

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  
  // 2. Fetch Leaderboard snapshots
  const { podium, entries, currentUserEntry } = await getLeaderboardData();

  // Sorting podium: Rank 2 (left), Rank 1 (center), Rank 3 (right)
  const sortedPodium = [...podium].sort((a, b) => {
    if (a.rank === 1) return 0; // Rank 1 center
    if (b.rank === 1) return 1;
    if (a.rank === 2) return -1; // Rank 2 left
    return 1;
  });

  // Re-adjust so we explicitly have center first or exactly order: [Rank 2, Rank 1, Rank 3]
  const podiumOrder = [
    podium.find((p) => p.rank === 2),
    podium.find((p) => p.rank === 1),
    podium.find((p) => p.rank === 3),
  ].filter((p): p is LeaderboardEntry => !!p);


  return (
    <div className="space-y-8 pb-24">
      {/* Page Header */}
      <FadeIn>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campus Leaderboard 🏆</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Top performing student workers on your campus.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/performance" className="flex items-center gap-1.5">
              <User className="size-4" />
              Your Performance
            </Link>
          </Button>
        </div>
      </FadeIn>

      {/* Podium Deck for Top 3 */}
      {podium.length > 0 && (
        <div className="flex flex-col items-center justify-center pt-8 sm:flex-row sm:items-end sm:gap-6 max-w-3xl mx-auto">
          {podiumOrder.map((entry, index) => {
            const isFirst = entry.rank === 1;
            const isSecond = entry.rank === 2;
            const isThird = entry.rank === 3;

            let heightClass = "h-48";
            let podiumColor = "border-slate-200 bg-slate-50/50 dark:bg-slate-900/10";
            let trophyColor = "text-slate-400";
            let avatarSize = "h-16 w-16";

            if (isFirst) {
              heightClass = "h-60 sm:-mt-8 order-2 z-10 scale-105";
              podiumColor = "border-warning/30 bg-warning/5 dark:bg-warning/5";
              trophyColor = "text-warning";
              avatarSize = "h-20 w-20 ring-4 ring-warning/30";
            } else if (isSecond) {
              heightClass = "h-48 order-1";
              podiumColor = "border-slate-300 bg-slate-100/40 dark:bg-slate-800/10";
              trophyColor = "text-slate-400";
              avatarSize = "h-16 w-16 ring-2 ring-slate-400/20";
            } else if (isThird) {
              heightClass = "h-40 order-3";
              podiumColor = "border-amber-700/20 bg-orange-50/20 dark:bg-orange-900/5";
              trophyColor = "text-orange-700/80";
              avatarSize = "h-14 w-14 ring-2 ring-orange-700/10";
            }

            return (
              <Card 
                key={`${entry.user.id}-${index}`} 
                className={`relative w-full max-w-[200px] flex flex-col items-center justify-end p-5 text-center border-t-4 shadow-soft transition-transform hover:scale-105 duration-200 mt-6 sm:mt-0 ${podiumColor}`}
              >
                {/* Ranking Badge */}
                <div className={`absolute -top-5 left-1/2 -translate-x-1/2 size-9 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-card ${
                  isFirst ? "border-warning text-warning-foreground" : isSecond ? "border-slate-400 text-slate-500" : "border-orange-600/30 text-orange-700"
                }`}>
                  {entry.rank}
                </div>

                <div className="space-y-3 flex flex-col items-center mb-2">
                  <Avatar className={avatarSize}>
                    <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      {initials(entry.user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <Link href={`/profile/${entry.user.id}`} className="font-bold text-sm hover:underline block truncate max-w-[140px]">
                      {entry.user.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{entry.user.college}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Trophy className={`size-4 ${trophyColor}`} />
                    <span className="font-extrabold text-sm text-foreground tracking-tight tabular-nums">
                      {entry.performanceScore.toFixed(1)}
                    </span>
                  </div>
                  {entry.user.ratingAvg > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="size-3.5 fill-warning text-warning" />
                      <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                        {entry.user.ratingAvg.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Achievement Badges previews */}
                <div className="flex gap-1 flex-wrap justify-center min-h-[20px] max-w-full">
                  {entry.badges.slice(0, 3).map((b: string) => (
                    <span key={b} title={badgeDisplay[b]?.label} className="cursor-help">
                      {badgeDisplay[b]?.icon}
                    </span>
                  ))}
                </div>

                {/* Base Podium Column Block */}
                <div className={`w-full mt-4 rounded-md flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground ${heightClass}`}>
                  <div className="flex flex-col items-center gap-1 text-xs">
                    <Briefcase className="size-4 text-muted-foreground/60" />
                    <span>{entry.completedTasks} Gigs</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Leaderboard Entries List Table (Ranks 4+) */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Top Performers</h2>

        {entries.length > 0 ? (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3.5 text-center w-16">Rank</th>
                    <th className="px-5 py-3.5">Student Worker</th>
                    <th className="px-5 py-3.5 text-center w-24">Gigs</th>
                    <th className="px-5 py-3.5 text-center w-24">Rating</th>
                    <th className="px-5 py-3.5 text-center w-36">Badges</th>
                    <th className="px-5 py-3.5 text-right w-28">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {entries.map((entry, index) => (
                    <tr 
                      key={`${entry.user.id}-${index}`} 
                      className={`hover:bg-muted/10 transition-colors ${
                        entry.user.id === user?.id ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 text-center font-bold text-muted-foreground tabular-nums">
                        #{entry.rank}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
                            <AvatarFallback>{initials(entry.user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/profile/${entry.user.id}`} className="font-semibold hover:text-primary transition-colors block">
                              {entry.user.name}
                            </Link>
                            <p className="text-[10px] text-muted-foreground">{entry.user.college}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium text-foreground/80 tabular-nums">
                        {entry.completedTasks}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {entry.user.ratingAvg > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold">
                            <Star className="size-3.5 fill-warning text-warning" />
                            {entry.user.ratingAvg.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {entry.badges.map((b) => (
                            <Badge 
                              key={b} 
                              variant="secondary" 
                              className={`text-[9px] font-semibold tracking-wide border-0 shadow-none px-2 py-0.5 ${badgeDisplay[b]?.color}`}
                            >
                              {badgeDisplay[b]?.icon} {badgeDisplay[b]?.label}
                            </Badge>
                          ))}
                          {entry.badges.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-accent tabular-nums text-base">
                        {entry.performanceScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center bg-card shadow-soft text-muted-foreground text-sm py-12">
            <Trophy className="size-8 mx-auto text-muted mb-3" />
            <p className="font-semibold text-foreground">No ranks calculated yet</p>
            <p className="text-xs mt-1.5"> Ranks recalculate dynamically once workers complete gigs and earn reviews.</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom Rank Bar for the current user */}
      {currentUserEntry && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-t shadow-lg py-3 px-6 flex items-center justify-between max-w-5xl mx-auto rounded-t-xl">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentUserEntry.user.avatarUrl} alt={currentUserEntry.user.name} />
              <AvatarFallback>{initials(currentUserEntry.user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">Your Current Rank</p>
              <p className="font-bold text-sm flex items-center gap-1.5">
                <span className="text-primary">#{currentUserEntry.rank}</span>
                <span className="text-muted-foreground font-normal">· {currentUserEntry.user.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Performance Score</p>
              <p className="font-extrabold text-accent tabular-nums">{currentUserEntry.performanceScore.toFixed(1)}</p>
            </div>
            <Button asChild size="sm" variant="brand">
              <Link href="/dashboard/performance">Performance Locker</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
