"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowCardProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
  /** Lift distance on hover. */
  lift?: number;
  /** Spotlight tint color (CSS color, defaults to brand fuchsia). */
  spotlight?: string;
  /** Classes for the inner content wrapper (e.g. flex layout). */
  contentClassName?: string;
}

/**
 * Card wrapper with a pointer-following spotlight, hover lift, and neon glow.
 * Degrades to a static card under prefers-reduced-motion.
 */
export function GlowCard({
  children,
  className,
  lift = 5,
  spotlight = "hsl(var(--brand-2) / 0.16)",
  contentClassName,
  ...props
}: GlowCardProps) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      whileHover={reduce ? undefined : { y: -lift }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "group/glow relative overflow-hidden rounded-xl border bg-card transition-shadow duration-300 hover:shadow-glow",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/glow:opacity-100"
        style={{
          background: `radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), ${spotlight}, transparent 60%)`,
        }}
      />
      <div className={cn("relative h-full", contentClassName)}>{children}</div>
    </motion.div>
  );
}
