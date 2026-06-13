"use client";

import { ShieldCheck, BadgeCheck, MessagesSquare, Wallet } from "lucide-react";
import { FadeIn, StaggerGroup, staggerItem } from "@/components/motion/fade-in";
import { motion } from "framer-motion";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Escrow-protected payments",
    desc: "Money is held safely and only released when work is approved. No more 'I'll pay you later'.",
  },
  {
    icon: BadgeCheck,
    title: "Verified students only",
    desc: "Google + phone verification and college details keep the network trusted and real.",
  },
  {
    icon: MessagesSquare,
    title: "Built-in chat & coordination",
    desc: "Discuss details, share files, and schedule meetings — all in one place.",
  },
  {
    icon: Wallet,
    title: "Wallet & instant payouts",
    desc: "Track earnings, view transaction history, and withdraw to your bank or UPI.",
  },
];

export function WhyCampusGig() {
  return (
    <section className="border-y bg-muted/30 py-20">
      <div className="container">
        <FadeIn className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why students trust CampusGig
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built for safety, speed, and reputation from day one.
          </p>
        </FadeIn>

        <StaggerGroup className="mt-12 grid gap-6 sm:grid-cols-2">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.title}
                variants={staggerItem}
                className="flex gap-4 rounded-xl border bg-card p-6 shadow-soft"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-brand text-primary-foreground">
                  <Icon className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {r.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
