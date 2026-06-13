import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
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

const accentMap = {
  primary: "from-primary/10 text-primary",
  accent: "from-accent/10 text-accent",
  secondary: "from-secondary/10 text-secondary",
  warning: "from-warning/15 text-warning-foreground",
};

export function StatCard({
  label,
  value,
  icon,
  formatType = "number",
  accent = "primary",
  hint,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-lift">
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br to-transparent blur-xl",
          accentMap[accent]
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">
            <AnimatedCounter value={value} formatType={formatType} />
          </p>
          {hint && (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg bg-muted",
            accentMap[accent].split(" ")[1]
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
