import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Award, TrendingUp, Zap, CheckCircle2, Clock, Sparkles, Star, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/user";
import { getPerformanceDashboard } from "@/features/leaderboard/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

const badgeDisplay: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  rising_star: { 
    label: "Rising Star", 
    icon: "🚀", 
    color: "from-orange-500/20 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/30",
    desc: "Complete your first gig with a perfect 5-star rating"
  },
  top_performer: { 
    label: "Top Performer", 
    icon: "🔥", 
    color: "from-red-500/20 to-orange-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30",
    desc: "Achieve a performance score >= 95 and complete at least 3 gigs"
  },
  fast_delivery: { 
    label: "Speed Demon", 
    icon: "⚡", 
    color: "from-yellow-500/20 to-amber-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30",
    desc: "Submit approved deliverables before the scheduled deadline"
  },
  trusted_worker: { 
    label: "Vetted Pro", 
    icon: "🛡️", 
    color: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30",
    desc: "Complete at least 5 gigs with an average rating of 4.5 or higher"
  },
};

export default async function PerformanceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const performance = await getPerformanceDashboard(user.id);
  if (!performance) {
    notFound();
  }

  // Calculate circular stroke details
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (performance.performanceScore / 100) * circumference;

  return (
    <div className="space-y-8 pb-12">
      {/* Back to Dashboard */}
      <div>
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      {/* Page Header */}
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Locker 🎯</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your standing, reputations, and earned badges on campus.
          </p>
        </div>
      </FadeIn>

      {/* circular radial chart + statistics row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Radial gauge chart */}
        <Card className="md:col-span-1 flex flex-col items-center justify-center p-6 text-center shadow-soft">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Performance Score
          </h3>
          
          <div className="relative size-36 flex items-center justify-center">
            {/* SVG Ring Gauge */}
            <svg className="size-full -rotate-90">
              {/* background ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-muted fill-none"
                strokeWidth="10"
              />
              {/* progress ring */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="stroke-primary fill-none transition-all duration-1000 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
                {performance.performanceScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Points
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-warning">
              <Trophy className="size-4" />
              <span className="text-sm font-extrabold text-foreground">
                {performance.rank ? `Rank #${performance.rank}` : "Unranked"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground italic leading-relaxed">
              Calculated dynamically against active campus workers
            </p>
          </div>
        </Card>

        {/* Breakdown details */}
        <Card className="md:col-span-2 p-6 shadow-soft space-y-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Reputation Breakdown
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4 bg-muted/10 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Star className="size-4 text-warning" />
                Average Rating
              </span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {performance.averageRating.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Across {performance.completedTasks} completed jobs
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-muted/10 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" />
                Completion Rate
              </span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {performance.successRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                Gigs completed vs assigned ({performance.completedTasks}/{performance.totalTasks})
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-muted/10 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-secondary" />
                On-Time Rate
              </span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {performance.onTimeRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                Submissions made before deadlines
              </p>
            </div>

            <div className="rounded-xl border p-4 bg-muted/10 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Zap className="size-4 text-accent" />
                Task Payouts
              </span>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {performance.completedTasks} gigs
              </p>
              <p className="text-[10px] text-muted-foreground">
                Gigs completed successfully
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Badges achievements locker */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 border-b pb-2">
          <Award className="size-5 text-warning" />
          Achievements Locker
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Earned Badges */}
          {performance.earnedBadges.map((badge) => {
            const display = badgeDisplay[badge];
            if (!display) return null;
            return (
              <div 
                key={badge} 
                className={cn(
                  "relative overflow-hidden rounded-xl border p-5 flex items-start gap-4 bg-gradient-to-br bg-card shadow-sm border-t-2",
                  display.color
                )}
              >
                <div className="text-3xl shrink-0 p-2.5 rounded-xl bg-card border shadow-sm">
                  {display.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">{display.label}</h4>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">
                      Earned
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {display.desc}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Locked Badges */}
          {performance.lockedBadges.map((badge) => {
            const display = badgeDisplay[badge.name];
            if (!display) return null;
            return (
              <div 
                key={badge.name} 
                className="relative overflow-hidden rounded-xl border border-dashed p-5 flex items-start gap-4 bg-muted/10 opacity-65 grayscale"
              >
                <div className="text-3xl shrink-0 p-2.5 rounded-xl bg-card border shadow-sm">
                  {display.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-foreground">{display.label}</h4>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Locked
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {display.desc}
                  </p>
                </div>
              </div>
            );
          })}

          {performance.earnedBadges.length === 0 && performance.lockedBadges.length === 0 && (
            <div className="col-span-2 py-10 text-center text-xs text-muted-foreground italic">
              No badges configured.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
