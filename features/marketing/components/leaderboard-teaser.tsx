import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { RankCard } from "@/components/shared/rank-card";
import { demoLeaderboard } from "@/lib/demo-data";

export function LeaderboardTeaser() {
  return (
    <section className="container py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <FadeIn>
          <div className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning-foreground">
            <Trophy className="size-3.5" />
            Campus leaderboard
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Climb the ranks. <br />
            Get recognised.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Every completed task and 5-star review boosts your performance
            score. Top students earn badges, trust, and more gigs — automatically
            ranked weekly, monthly, and all-time.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link href="/login">
              Sign in to compete
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </FadeIn>

        <FadeIn delay={0.15} className="space-y-3">
          {demoLeaderboard.map((entry) => (
            <RankCard key={entry.user.id} entry={entry} />
          ))}
        </FadeIn>
      </div>
    </section>
  );
}
