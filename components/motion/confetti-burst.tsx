"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const COLORS = ["#4F46E5", "#10B981", "#7C3AED", "#F59E0B", "#E11D48"];

interface ConfettiBurstProps {
  /** Toggle to fire the burst. */
  fire: boolean;
  pieces?: number;
  onDone?: () => void;
}

/** Lightweight, dependency-free confetti burst for milestones (payment, badge, rank-up). */
export function ConfettiBurst({
  fire,
  pieces = 36,
  onDone,
}: ConfettiBurstProps) {
  const reduce = useReducedMotion();
  const confetti = React.useMemo(
    () =>
      Array.from({ length: pieces }).map((_, i) => ({
        id: i,
        x: (i / pieces) * 320 - 160 + (i % 5) * 7,
        rotate: (i % 7) * 60,
        color: COLORS[i % COLORS.length],
        delay: (i % 6) * 0.03,
      })),
    [pieces]
  );

  if (reduce) return null;

  return (
    <AnimatePresence onExitComplete={onDone}>
      {fire && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-50 h-0 w-0"
        >
          {confetti.map((c) => (
            <motion.span
              key={c.id}
              className="absolute h-2 w-2 rounded-[2px]"
              style={{ backgroundColor: c.color }}
              initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: c.x,
                y: 220 + (c.id % 4) * 30,
                rotate: c.rotate + 180,
                scale: 0.6,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, delay: c.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
