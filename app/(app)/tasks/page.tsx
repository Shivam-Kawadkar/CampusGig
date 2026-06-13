import Link from "next/link";
import { Plus, SearchX } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/shared/task-card";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { listTasks } from "@/features/tasks/repository";
import { taskFiltersSchema } from "@/features/tasks/schema";
import { demoTasks } from "@/lib/demo-data";

export const metadata = { title: "Browse tasks" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters = taskFiltersSchema.parse({
    q: sp.q,
    category: sp.category,
    minBudget: sp.minBudget,
    maxBudget: sp.maxBudget,
    sort: sp.sort ?? "newest",
  });

  const hasFilters = Boolean(sp.q || sp.category);
  const realTasks = await listTasks(filters);

  // Show sample tasks only when there are no real results AND no active filters,
  // so the marketplace looks alive before any tasks exist / migration is applied.
  const showDemo = realTasks.length === 0 && !hasFilters;
  const tasks = showDemo ? demoTasks : realTasks;

  return (
    <div className="space-y-6">
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Browse tasks</h1>
          <p className="mt-1 text-muted-foreground">
            Find work that matches your skills and start earning.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link href="/tasks/new">
            <Plus className="size-4" />
            Post a task
          </Link>
        </Button>
      </FadeIn>

      <TaskFilters />

      {showDemo && (
        <Badge variant="warning" className="w-fit">
          Showing sample tasks — be the first to post a real one!
        </Badge>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="No tasks found"
          description="Try adjusting your filters or search terms."
          action={
            <Button asChild variant="outline">
              <Link href="/tasks">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
