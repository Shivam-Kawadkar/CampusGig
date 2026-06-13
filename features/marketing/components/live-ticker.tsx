"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EVENTS = [
  "Aarav just earned ₹1,500 for a logo design 🎨",
  "Sneha completed a React bug fix in 2h ⚡",
  "Rahul got hired for assignment help 📚",
  "Priya climbed to #3 on the leaderboard 🏆",
  "Karan withdrew ₹8,200 to UPI 💸",
  "Meera left a 5★ review ⭐",
  "Dev posted a new data-entry gig 💼",
];

export function LiveTicker() {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((p) => (p + 1) % EVENTS.length), 2800);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border bg-card/70 px-3 py-1.5 text-xs backdrop-blur-sm">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span className="font-medium text-muted-foreground">Live</span>
      <span className="hidden h-3 w-px bg-border sm:block" />
      <div className="relative h-4 min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={reduce ? false : { y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -12, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 truncate font-medium text-foreground"
          >
            {EVENTS[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
