"use client";

import {
  Palette,
  Code2,
  PenLine,
  GraduationCap,
  Camera,
  Megaphone,
  FileSpreadsheet,
  Languages,
} from "lucide-react";
import { FadeIn, StaggerGroup, staggerItem } from "@/components/motion/fade-in";
import { motion } from "framer-motion";

const categories = [
  { name: "Design", icon: Palette, color: "bg-secondary/10 text-secondary" },
  { name: "Coding", icon: Code2, color: "bg-primary/10 text-primary" },
  { name: "Writing", icon: PenLine, color: "bg-accent/10 text-accent" },
  { name: "Tutoring", icon: GraduationCap, color: "bg-warning/15 text-warning-foreground" },
  { name: "Photography", icon: Camera, color: "bg-secondary/10 text-secondary" },
  { name: "Marketing", icon: Megaphone, color: "bg-primary/10 text-primary" },
  { name: "Data Entry", icon: FileSpreadsheet, color: "bg-accent/10 text-accent" },
  { name: "Translation", icon: Languages, color: "bg-warning/15 text-warning-foreground" },
];

export function Categories() {
  return (
    <section className="border-y bg-muted/30 py-20">
      <div className="container">
        <FadeIn className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Popular categories
          </h2>
          <p className="mt-3 text-muted-foreground">
            From design to debugging — there&apos;s a gig for every skill.
          </p>
        </FadeIn>

        <StaggerGroup className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.name}
                variants={staggerItem}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-soft transition-shadow hover:shadow-lift"
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-lg ${c.color}`}
                >
                  <Icon className="size-6" />
                </div>
                <span className="text-sm font-medium">{c.name}</span>
              </motion.div>
            );
          })}
        </StaggerGroup>
      </div>
    </section>
  );
}
