"use client";

import { FileText, Users, CheckCircle2 } from "lucide-react";
import { FadeIn, StaggerGroup, staggerItem } from "@/components/motion/fade-in";
import { motion } from "framer-motion";

const steps = [
  {
    icon: FileText,
    title: "Post a task",
    desc: "Describe what you need, set a budget and deadline. Funds are held safely in escrow.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Users,
    title: "Pick the best student",
    desc: "Compare proposals by rating, rank, and price. Chat before you commit.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: CheckCircle2,
    title: "Get it done & paid",
    desc: "Approve the work to release payment instantly. Then rate each other.",
    color: "bg-accent/10 text-accent",
  },
];

export function HowItWorks() {
  return (
    <section className="container py-20">
      <FadeIn className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How CampusGig works
        </h2>
        <p className="mt-3 text-muted-foreground">
          Three simple steps — whether you&apos;re hiring or earning.
        </p>
      </FadeIn>

      <StaggerGroup className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              variants={staggerItem}
              className="relative rounded-xl border bg-card p-6 shadow-soft"
            >
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-muted/60">
                {i + 1}
              </span>
              <div
                className={`grid h-12 w-12 place-items-center rounded-lg ${s.color}`}
              >
                <Icon className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
