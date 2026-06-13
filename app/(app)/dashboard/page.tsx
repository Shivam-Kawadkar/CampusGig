import { Wallet, Trophy, Briefcase, Star } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { StatCard } from "@/components/shared/stat-card";
import { TaskCard } from "@/components/shared/task-card";
import { demoTasks } from "@/lib/demo-data";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening on your campus today.
        </p>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={245000}
          formatType="inr"
          icon={<Wallet className="size-5" />}
          accent="accent"
        />
        <StatCard
          label="Earned this month"
          value={812000}
          formatType="inr"
          icon={<Star className="size-5" />}
          accent="primary"
          hint="+18% vs last month"
        />
        <StatCard
          label="Active tasks"
          value={3}
          icon={<Briefcase className="size-5" />}
          accent="secondary"
        />
        <StatCard
          label="Campus rank"
          value={4}
          formatType="rank"
          icon={<Trophy className="size-5" />}
          accent="warning"
          hint="Top 2% this week"
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <span className="text-sm text-muted-foreground">
            Based on your skills
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {demoTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}
