"use client";

import * as React from "react";
import { ConfettiBurst } from "./confetti-burst";

/**
 * Fires a one-shot confetti burst when mounted (e.g. on leaderboard load,
 * podium reveal). Centered within its nearest positioned ancestor.
 */
export function CelebrateOnMount({ pieces }: { pieces?: number }) {
  const [fire, setFire] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setFire(true), 250);
    return () => clearTimeout(t);
  }, []);

  return <ConfettiBurst fire={fire} pieces={pieces} />;
}
