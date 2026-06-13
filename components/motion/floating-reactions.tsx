"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const DEFAULT_EMOJIS = ["🎉", "💸", "⭐", "🚀", "🔥", "💼", "✅", "👏", "💜"];

interface Reaction {
  id: number;
  emoji: string;
  left: number; // %
  drift: number; // px horizontal drift
  duration: number;
}

/**
 * Ambient "live" emoji reactions that float upward at an interval — gives the
 * landing a lively, in-use feel. No-ops under prefers-reduced-motion.
 */
export function FloatingReactions({
  emojis = DEFAULT_EMOJIS,
  intervalMs = 1400,
  className,
}: {
  emojis?: string[];
  intervalMs?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [items, setItems] = React.useState<Reaction[]>([]);
  const counter = React.useRef(0);

  React.useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => {
      const id = counter.current++;
      const emoji = emojis[id % emojis.length];
      const left = 8 + Math.abs(Math.sin(id * 12.9898) * 84);
      const drift = ((id % 5) - 2) * 16;
      const duration = 3.2 + (id % 4) * 0.5;
      setItems((prev) => [...prev.slice(-8), { id, emoji, left, drift, duration }]);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [emojis, intervalMs, reduce]);

  if (reduce) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <AnimatePresence>
        {items.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0, y: 40, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -160, x: r.drift, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: r.duration, ease: "easeOut" }}
            onAnimationComplete={() =>
              setItems((prev) => prev.filter((p) => p.id !== r.id))
            }
            className="absolute bottom-4 text-2xl"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
