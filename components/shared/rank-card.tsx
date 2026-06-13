import { Award, Rocket, Zap, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";
import type { AchievementBadge, LeaderboardEntry } from "@/lib/types";

const badgeMeta: Record<
  AchievementBadge,
  { label: string; icon: typeof Award; className: string }
> = {
  rising_star: {
    label: "Rising Star",
    icon: Rocket,
    className: "bg-secondary/10 text-secondary",
  },
  top_performer: {
    label: "Top Performer",
    icon: Award,
    className: "bg-primary/10 text-primary",
  },
  fast_delivery: {
    label: "Fast Delivery",
    icon: Zap,
    className: "bg-warning/15 text-warning-foreground",
  },
  trusted_worker: {
    label: "Trusted Worker",
    icon: ShieldCheck,
    className: "bg-accent/10 text-accent",
  },
};

const rankAccent: Record<number, string> = {
  1: "from-warning/20 ring-warning/40",
  2: "from-muted ring-border",
  3: "from-secondary/15 ring-secondary/30",
};

export function AchievementBadgeChip({ badge }: { badge: AchievementBadge }) {
  const meta = badgeMeta[badge];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.className
      )}
      title={meta.label}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

export function RankCard({ entry }: { entry: LeaderboardEntry }) {
  const isPodium = entry.rank <= 3;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift",
        isPodium &&
          cn("bg-gradient-to-r to-transparent ring-1", rankAccent[entry.rank])
      )}
    >
      <div
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums",
          isPodium
            ? "bg-gradient-brand text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        #{entry.rank}
      </div>

      <Avatar className="h-11 w-11">
        <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />
        <AvatarFallback>{initials(entry.user.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{entry.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {entry.user.college} · {entry.completedTasks} tasks ·{" "}
          {entry.onTimeRate}% on-time
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {entry.badges.map((b) => (
            <AchievementBadgeChip key={b} badge={b} />
          ))}
        </div>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-primary tabular-nums">
          {entry.performanceScore.toFixed(1)}
        </p>
        <p className="text-[11px] text-muted-foreground">score</p>
      </div>
    </div>
  );
}
