"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { cn, deadlineLabel, formatINR, initials } from "@/lib/utils";
import type { TaskSummary } from "@/lib/types";

const categoryColors: Record<string, string> = {
  design: "bg-secondary/10 text-secondary",
  coding: "bg-primary/10 text-primary",
  writing: "bg-accent/10 text-accent",
  tutoring: "bg-warning/15 text-warning-foreground",
};

export function TaskCard({ task }: { task: TaskSummary }) {
  const overdue = deadlineLabel(task.deadline) === "Overdue";
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="group flex h-full flex-col p-5 transition-shadow hover:shadow-lift">
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              "capitalize",
              categoryColors[task.category.slug] ?? "bg-muted text-foreground"
            )}
          >
            {task.category.name}
          </Badge>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              overdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Clock className="size-3.5" />
            {deadlineLabel(task.deadline)}
          </span>
        </div>

        <Link href={`/tasks/${task.id}`} className="mt-3 block">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary">
            {task.title}
          </h3>
        </Link>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between pt-5">
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-lg font-bold text-accent tabular-nums">
              {formatINR(task.budget)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            {task.proposalCount} bids
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t pt-4">
          <Avatar className="h-7 w-7">
            <AvatarImage src={task.poster.avatarUrl} alt={task.poster.name} />
            <AvatarFallback>{initials(task.poster.name)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-xs text-muted-foreground">
            {task.poster.name} · {task.poster.college}
          </span>
          <RatingStars
            rating={task.poster.ratingAvg}
            size={12}
            className="ml-auto"
          />
        </div>
      </Card>
    </motion.div>
  );
}
