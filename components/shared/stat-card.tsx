import * as React from "react";
import { cn } from "@/lib/utils";
import { GlowCard } from "@/components/motion/glow-card";
import {
  AnimatedCounter,
  type CounterFormat,
} from "@/components/motion/animated-counter";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** Serializable format selector — safe from Server Components. */
  formatType?: CounterFormat;
  accent?: "primary" | "accent" | "secondary" | "warning";
  hint?: string;
}

const accentMap: Record<
  NonNullable<StatCardProps["accent"]>,
  { chip: string; spot: string }
> = {
  primary: {
    chip: "bg-gradient-to-br from-primary to-secondary",
    spot: "hsl(var(--brand-1) / 0.20)",
  },
  accent: {
    chip: "bg-gradient-to-br from-accent to-[hsl(174_72%_45%)]",
    spot: "hsl(var(--accent) / 0.22)",
  },
  secondary: {
    chip: "bg-gradient-to-br from-secondary to-[hsl(var(--brand-3))]",
    spot: "hsl(var(--brand-2) / 0.22)",
  },
  warning: {
    chip: "bg-gradient-to-br from-warning to-[hsl(24_92%_55%)]",
    spot: "hsl(var(--warning) / 0.22)",
  },
};

export function StatCard({
  label,
  value,
  icon,
  formatType = "number",
  accent = "primary",
  hint,
}: StatCardProps) {
  const a = accentMap[accent];
  return (
    <GlowCard className="glass p-5" spotlight={a.spot}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">
            <AnimatedCounter value={value} formatType={formatType} />
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-glow",
            a.chip
          )}
        >
          {icon}
        </div>
      </div>
    </GlowCard>
  );
}
