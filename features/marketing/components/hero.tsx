"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { FloatingReactions } from "@/components/motion/floating-reactions";
import { GlowCard } from "@/components/motion/glow-card";
import { LiveTicker } from "./live-ticker";
import { formatINR } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <AuroraBackground className="-z-10" />
      <FloatingReactions className="-z-10" />

      <div className="container grid gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 w-fit max-w-full"
          >
            <LiveTicker />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-soft"
          >
            <Sparkles className="size-3.5 text-secondary" />
            Trusted student marketplace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Your campus. <br />
            Your skills. <br />
            <span className="text-gradient-brand">Your income.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 max-w-md text-lg text-muted-foreground"
          >
            Post tasks or earn money helping fellow students — with escrow-safe
            payments, verified profiles, and a campus reputation that ranks you
            up.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button asChild variant="brand" size="lg" className="shadow-glow">
              <Link href="/login">
                Continue with Google
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#how">See how it works</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex items-center gap-5 text-sm text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-accent" />
              Escrow protected
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="size-4 fill-warning text-warning" />
              Verified students only
            </span>
          </motion.div>
        </div>

        {/* Floating preview cards */}
        <div className="relative hidden lg:block">
          <FloatingCard
            className="left-4 top-6"
            delay={0.3}
            title="Logo design"
            sub="Design · 2d left"
            amount={150000}
          />
          <FloatingCard
            className="right-2 top-40"
            delay={0.5}
            title="React bug fix"
            sub="Coding · 1d left"
            amount={80000}
          />
          <FloatingCard
            className="left-16 bottom-6"
            delay={0.7}
            title="Research summary"
            sub="Writing · 3d left"
            amount={60000}
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  delay,
  title,
  sub,
  amount,
}: {
  className?: string;
  delay: number;
  title: string;
  sub: string;
  amount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      className={`absolute w-56 rounded-xl border bg-card p-4 shadow-lift ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
      >
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
        <p className="mt-2 text-lg font-bold text-accent tabular-nums">
          {formatINR(amount)}
        </p>
      </motion.div>
    </motion.div>
  );
}
