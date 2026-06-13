import * as React from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-aligned slot (buttons, switchers). */
  action?: React.ReactNode;
  className?: string;
}

/** Consistent animated page header with an aurora wash. Server-safe. */
export function PageHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card/60 p-6 backdrop-blur-sm",
          className
        )}
      >
        <AuroraBackground className="opacity-80" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-glow">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </FadeIn>
  );
}
