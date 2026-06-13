"use client";

import * as React from "react";
import {
  useInView,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { cn, formatINR } from "@/lib/utils";

export type CounterFormat = "number" | "inr" | "rank" | "score";

function resolveFormat(type: CounterFormat): (n: number) => string {
  switch (type) {
    case "inr":
      return (n) => formatINR(Math.round(n));
    case "rank":
      return (n) => `#${Math.round(n)}`;
    case "score":
      return (n) => n.toFixed(1);
    default:
      return (n) => Math.round(n).toLocaleString("en-IN");
  }
}

interface AnimatedCounterProps {
  value: number;
  /** Inline formatter (client components only — not serializable across RSC boundary). */
  format?: (n: number) => string;
  /** Serializable format selector — safe to pass from Server Components. */
  formatType?: CounterFormat;
  className?: string;
  durationMs?: number;
}

/** Counts up to `value` when scrolled into view. Respects reduced motion. */
export function AnimatedCounter({
  value,
  format,
  formatType = "number",
  className,
  durationMs = 1200,
}: AnimatedCounterProps) {
  const fmt = format ?? resolveFormat(formatType);
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, {
    duration: durationMs,
    bounce: 0,
  });
  const [display, setDisplay] = React.useState(() => fmt(reduce ? value : 0));

  React.useEffect(() => {
    if (reduce) {
      setDisplay(fmt(value));
      return;
    }
    if (inView) mv.set(value);
  }, [inView, value, reduce, mv, fmt]);

  React.useEffect(() => {
    if (reduce) return;
    return spring.on("change", (latest) => setDisplay(fmt(latest)));
  }, [spring, fmt, reduce]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </span>
  );
}
