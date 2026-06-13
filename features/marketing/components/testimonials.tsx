"use client";

import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn, StaggerGroup, staggerItem } from "@/components/motion/fade-in";
import { motion } from "framer-motion";
import { initials } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "I made ₹8,000 last month designing posters between classes. Getting paid through escrow means I never worry about not getting paid.",
    name: "Sneha Rao",
    role: "Design student · BMS College",
  },
  {
    quote:
      "Posted my coding assignment task and had 4 solid proposals in an hour. Picked someone with a great rank — work was perfect.",
    name: "Divya Iyer",
    role: "CSE · RV University",
  },
  {
    quote:
      "The leaderboard is addictive. Hitting Top Performer got me way more gigs. It actually feels rewarding to do good work.",
    name: "Arjun Mehta",
    role: "MBA · RV University",
  },
];

export function Testimonials() {
  return (
    <section className="container py-20">
      <FadeIn className="mx-auto max-w-xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Loved by students
        </h2>
        <p className="mt-3 text-muted-foreground">
          Real earnings, real reputation, real trust.
        </p>
      </FadeIn>

      <StaggerGroup className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <motion.figure
            key={t.name}
            variants={staggerItem}
            className="flex flex-col rounded-xl border bg-card p-6 shadow-soft"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-warning text-warning" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(t.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </StaggerGroup>
    </section>
  );
}
