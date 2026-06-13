"use client";

import { AnimatedCounter } from "@/components/motion/animated-counter";
import { formatINR } from "@/lib/utils";

const stats = [
  { label: "Paid out to students", value: 4820000, format: (n: number) => formatINR(Math.round(n)) },
  { label: "Tasks completed", value: 1240, format: (n: number) => `${Math.round(n).toLocaleString("en-IN")}+` },
  { label: "Active students", value: 3600, format: (n: number) => `${Math.round(n).toLocaleString("en-IN")}+` },
  { label: "Avg. rating", value: 4.9, format: (n: number) => n.toFixed(1) + "★" },
];

export function StatsBand() {
  return (
    <section className="bg-gradient-brand py-14 text-primary-foreground">
      <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-extrabold sm:text-4xl">
              <AnimatedCounter value={s.value} format={s.format} />
            </p>
            <p className="mt-1 text-sm opacity-90">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
