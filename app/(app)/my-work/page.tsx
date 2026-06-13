import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  FileText,
  Plus,
  ArrowUpRight,
  XCircle,
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { formatINR, deadlineLabel } from "@/lib/utils";

export const metadata = {
  title: "My Work | CampusGig",
  description: "Track your active gigs, applications, and completed work",
};

// ── Type helpers ──────────────────────────────────────────────────────────────

function resolveName(raw: unknown): string {
  if (!raw) return "—";
  if (Array.isArray(raw)) return (raw[0] as { name?: string })?.name ?? "—";
  return (raw as { name?: string })?.name ?? "—";
}

function resolveFullName(raw: unknown): string {
  if (!raw) return "—";
  if (Array.isArray(raw)) return (raw[0] as { full_name?: string })?.full_name ?? "—";
  return (raw as { full_name?: string })?.full_name ?? "—";
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; variant: "accent" | "warning" | "default" | "destructive" | "secondary" }
> = {
  open:        { label: "Open",        variant: "accent" },
  in_progress: { label: "In Progress", variant: "warning" },
  submitted:   { label: "Submitted",   variant: "warning" },
  completed:   { label: "Completed",   variant: "default" },
  disputed:    { label: "Disputed",    variant: "destructive" },
  cancelled:   { label: "Cancelled",   variant: "destructive" },
  pending:     { label: "Applied",     variant: "secondary" },
  accepted:    { label: "Accepted",    variant: "accent" },
  rejected:    { label: "Rejected",    variant: "destructive" },
  withdrawn:   { label: "Withdrawn",   variant: "secondary" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge variant={meta.variant} className="capitalize text-[11px]">
      {meta.label}
    </Badge>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  count,
  color = "text-primary",
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`size-5 ${color}`} />
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message, href, cta }: { message: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground space-y-3">
      <p className="text-sm">{message}</p>
      {href && cta && (
        <Button asChild variant="outline" size="sm">
          <Link href={href} className="gap-1.5">
            <Plus className="size-3.5" />
            {cta}
          </Link>
        </Button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // 1. Tasks assigned to me as worker
  const { data: workerTasksRaw } = await supabase
    .from("tasks")
    .select("id, title, budget, status, deadline, updated_at, poster_id, category:categories(name)")
    .eq("selected_worker_id", user.id)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false });

  // Resolve poster names for worker tasks
  const workerTasks = await Promise.all(
    (workerTasksRaw ?? []).map(async (t) => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, college")
        .eq("user_id", t.poster_id)
        .maybeSingle();
      return { ...t, posterName: prof?.full_name ?? "Poster", categoryName: resolveName(t.category) };
    })
  );

  // 2. My applications
  const { data: myAppsRaw } = await supabase
    .from("applications")
    .select("id, bid_amount, status, created_at, task_id")
    .eq("worker_id", user.id)
    .order("created_at", { ascending: false });

  const workerTaskIds = new Set(workerTasks.map((t) => t.id));

  // Resolve task details for applications
  const myApplications = await Promise.all(
    (myAppsRaw ?? [])
      .filter((a) => !workerTaskIds.has(a.task_id))
      .map(async (a) => {
        const { data: task } = await supabase
          .from("tasks")
          .select("id, title, budget, status, deadline, poster_id, category:categories(name)")
          .eq("id", a.task_id)
          .maybeSingle();

        const { data: prof } = task
          ? await supabase
              .from("profiles")
              .select("full_name, college")
              .eq("user_id", task.poster_id)
              .maybeSingle()
          : { data: null };

        return {
          ...a,
          task: task
            ? {
                id: task.id,
                title: task.title,
                budget: Number(task.budget),
                status: task.status,
                deadline: task.deadline,
                posterName: prof?.full_name ?? "Poster",
                categoryName: resolveName(task.category),
              }
            : null,
        };
      })
  );

  // 3. Tasks I posted
  const { data: postedTasksRaw } = await supabase
    .from("tasks")
    .select("id, title, budget, status, deadline, proposal_count, updated_at, category:categories(name)")
    .eq("poster_id", user.id)
    .order("updated_at", { ascending: false });

  const postedTasks = (postedTasksRaw ?? []).map((t) => ({
    ...t,
    categoryName: resolveName(t.category),
  }));

  // Splits
  const activeTasks = workerTasks.filter((t) =>
    ["in_progress", "submitted", "disputed"].includes(t.status)
  );
  const completedWorkerTasks = workerTasks.filter((t) => t.status === "completed");
  const activePostedTasks = postedTasks.filter((t) =>
    ["open", "in_progress", "submitted", "disputed"].includes(t.status)
  );
  const completedPostedTasks = postedTasks.filter((t) =>
    ["completed", "cancelled"].includes(t.status)
  );
  const pendingApps = myApplications.filter((a) => a.status === "pending");

  // Summary stats
  const totalEarned = completedWorkerTasks.reduce((s, t) => s + Number(t.budget), 0);
  const totalSpent = completedPostedTasks
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + Number(t.budget), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Briefcase className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Work</h1>
            <p className="text-sm text-muted-foreground">
              Your gigs, applications, and posted tasks
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Summary strip */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Active Gigs", value: String(activeTasks.length), color: "text-warning" },
            { label: "Open Proposals", value: String(pendingApps.length), color: "text-primary" },
            { label: "Total Earned", value: formatINR(totalEarned), color: "text-success" },
            { label: "Total Spent", value: formatINR(totalSpent), color: "text-accent" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-soft space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
              <p className={`text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* Active Worker Gigs */}
          <FadeIn delay={0.1}>
            <section id="active-gigs">
              <SectionHeader icon={Hourglass} title="Active Gigs" count={activeTasks.length} color="text-warning" />
              {activeTasks.length === 0 ? (
                <EmptyState message="No active gigs. Browse tasks and submit a proposal!" href="/tasks" cta="Browse tasks" />
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      id={`active-task-${task.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-semibold text-sm text-foreground">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {task.posterName} · {task.categoryName}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={task.status} />
                          <span className={`text-[11px] font-medium ${deadlineLabel(task.deadline) === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                            <Clock className="size-3 inline mr-0.5" />
                            {deadlineLabel(task.deadline)}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-accent text-sm">{formatINR(Number(task.budget))}</p>
                        <ChevronRight className="size-4 text-muted-foreground mt-1 ml-auto" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Completed Worker Gigs */}
          <FadeIn delay={0.15}>
            <section id="completed-gigs">
              <SectionHeader icon={CheckCircle2} title="Completed Gigs" count={completedWorkerTasks.length} color="text-success" />
              {completedWorkerTasks.length === 0 ? (
                <EmptyState message="No completed gigs yet. Earnings will appear here." />
              ) : (
                <div className="space-y-2">
                  {completedWorkerTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      id={`completed-task-${task.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground">{task.categoryName}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-sm font-bold text-success">{formatINR(Number(task.budget))}</span>
                        <Badge variant="default" className="text-[10px]">Paid</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>
        </div>

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className="space-y-8">

          {/* My Applications */}
          <FadeIn delay={0.1}>
            <section id="my-applications">
              <SectionHeader icon={FileText} title="My Proposals" count={myApplications.length} color="text-primary" />
              {myApplications.length === 0 ? (
                <EmptyState message="No proposals yet. Find a task and submit your first bid!" href="/tasks" cta="Browse tasks" />
              ) : (
                <div className="space-y-3">
                  {myApplications.map((app) => {
                    if (!app.task) return null;
                    return (
                      <Link
                        key={app.id}
                        href={`/tasks/${app.task.id}`}
                        id={`application-${app.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-muted/30"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-semibold text-sm text-foreground">{app.task.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {app.task.posterName} · {app.task.categoryName}
                          </p>
                          <StatusBadge status={app.status} />
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <p className="text-xs text-muted-foreground">Your bid</p>
                          <p className="font-bold text-accent text-sm">{formatINR(Number(app.bid_amount))}</p>
                          <p className="text-[10px] text-muted-foreground">Budget: {formatINR(app.task.budget)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Posted Tasks */}
          <FadeIn delay={0.15}>
            <section id="posted-tasks">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Plus className="size-5 text-accent" />
                  <h2 className="text-base font-bold tracking-tight">Posted Tasks</h2>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {postedTasks.length}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs gap-1">
                  <Link href="/tasks/new">
                    <Plus className="size-3.5" /> Post New
                  </Link>
                </Button>
              </div>

              {activePostedTasks.length > 0 && (
                <div className="space-y-3 mb-4">
                  {activePostedTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      id={`posted-task-${task.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-soft transition-colors hover:bg-muted/30"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-semibold text-sm text-foreground">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground">{task.categoryName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={task.status} />
                          <span className="text-[11px] text-muted-foreground">
                            {task.proposal_count} proposal{task.proposal_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold text-accent text-sm">{formatINR(Number(task.budget))}</p>
                        <p className={`text-[11px] mt-0.5 font-medium ${deadlineLabel(task.deadline) === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                          {deadlineLabel(task.deadline)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {completedPostedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">Past</p>
                  {completedPostedTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 opacity-70 transition-opacity hover:opacity-100"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-[11px] text-muted-foreground">{task.categoryName}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <StatusBadge status={task.status} />
                        <span className="text-sm font-semibold">{formatINR(Number(task.budget))}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {postedTasks.length === 0 && (
                <EmptyState message="You haven't posted any tasks yet." href="/tasks/new" cta="Post your first task" />
              )}
            </section>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
