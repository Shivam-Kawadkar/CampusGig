import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  Users,
  ListChecks,
  TrendingUp,
  ChevronDown,
  MessageSquare,
  Clock,
  Star,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { getAdminDashboardData } from "@/features/disputes/actions";
import { ResolveDisputePanel, SuspendUserButton, ModerateTaskButton, DeleteUserButton, EditUserRoleSelect } from "@/features/disputes/components/admin-actions";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export const metadata = {
  title: "Admin Panel | CampusGig",
  description: "Moderator admin dashboard — disputes, user management, and listing moderation",
};

const REASON_LABELS: Record<string, string> = {
  non_delivery: "Non-Delivery",
  poor_quality: "Poor Quality",
  scope_creep: "Scope Creep",
  payment_issue: "Payment Issue",
  communication: "Communication",
  other: "Other",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Verify admin
  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userRow?.role !== "admin") {
    redirect("/dashboard");
  }

  const data = await getAdminDashboardData();
  if (!data) redirect("/dashboard");

  const { data: feedbackRows } = await supabase
    .from("feedback")
    .select("id, name, email, rating, message, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const feedback = feedbackRows ?? [];

  const openDisputes = data.disputes.filter((d) => d.status === "opened");
  const resolvedDisputes = data.disputes.filter((d) => d.status === "resolved");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
          <Shield className="size-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Disputes · Users · Listings · Analytics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-soft space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Active Disputes</p>
          <p className="text-3xl font-extrabold text-destructive">{data.stats.activeDisputes}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Users</p>
          <p className="text-3xl font-extrabold">{data.stats.totalUsers}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed Tasks</p>
          <p className="text-3xl font-extrabold text-success">{data.stats.completedTasks}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-soft space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Escrow</p>
          <p className="text-2xl font-extrabold text-accent">{formatINR(data.stats.totalEscrow)}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="space-y-8">

        {/* ── Active Disputes ─────────────────────────────────────────────── */}
        <section id="admin-disputes" className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <h2 className="text-lg font-bold tracking-tight">
              Active Disputes
              {openDisputes.length > 0 && (
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-sm font-semibold text-destructive">
                  {openDisputes.length}
                </span>
              )}
            </h2>
          </div>

          {openDisputes.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <AlertTriangle className="size-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active disputes. Platform is healthy ✓</p>
            </div>
          ) : (
            <div className="space-y-4">
              {openDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  id={`dispute-card-${dispute.id}`}
                  className="rounded-xl border border-destructive/20 bg-card p-5 shadow-soft space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="destructive" className="text-xs">
                          {REASON_LABELS[dispute.reason] ?? dispute.reason}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          by <strong>{dispute.disputer_name}</strong>
                        </span>
                      </div>
                      <Link
                        href={`/tasks/${dispute.task_id}`}
                        className="mt-1 block text-sm font-semibold hover:underline text-foreground"
                      >
                        {dispute.task_title}
                      </Link>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Budget at stake</p>
                      <p className="font-bold text-accent">{formatINR(dispute.budget)}</p>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/80 leading-relaxed rounded-lg bg-muted/40 p-3">
                    &ldquo;{dispute.explanation}&rdquo;
                  </p>

                  {/* Evidence thread */}
                  {dispute.evidence.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="size-3.5" /> Evidence ({dispute.evidence.length})
                      </p>
                      <div className="space-y-2">
                        {dispute.evidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="rounded-lg bg-muted/30 border px-3 py-2 text-xs"
                          >
                            <p className="font-semibold text-foreground">{ev.submitter_name}</p>
                            <p className="text-foreground/70 mt-0.5 leading-relaxed">{ev.comment}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(ev.created_at).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <ResolveDisputePanel dispute={dispute} />

                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Filed {new Date(dispute.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Resolved disputes (collapsed summary) */}
          {resolvedDisputes.length > 0 && (
            <details className="group rounded-xl border bg-card shadow-soft">
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <span>Resolved Disputes ({resolvedDisputes.length})</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t px-5 py-4 space-y-3">
                {resolvedDisputes.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs gap-3">
                    <Link href={`/tasks/${d.task_id}`} className="font-medium hover:underline truncate">
                      {d.task_title}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {d.resolution_decision?.replace("_", " ") ?? "—"}
                      </Badge>
                      <span className="text-muted-foreground">{formatINR(d.budget)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* ── User Management ─────────────────────────────────────────────── */}
        <section id="admin-users" className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">
              User Management
              <span className="ml-2 text-sm font-normal text-muted-foreground">({data.users.length} total)</span>
            </h2>
          </div>

          <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold">User</th>
                    <th className="px-4 py-3 text-left font-semibold">College</th>
                    <th className="px-4 py-3 text-center font-semibold">Role</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Gigs</th>
                    <th className="px-4 py-3 text-center font-semibold">Rating</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.users.map((u) => (
                    <tr key={u.id} id={`user-row-${u.id}`} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{u.college || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        {u.id !== user.id ? (
                          <EditUserRoleSelect
                            userId={u.id}
                            currentRole={u.role}
                            userName={u.full_name}
                          />
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {u.role}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={u.status === "active" ? "default" : u.status === "suspended" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-semibold">{u.completed_gigs}</td>
                      <td className="px-4 py-3 text-center text-xs">{u.rating_avg.toFixed(1)} ★</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {u.id !== user.id && (
                            <>
                              <SuspendUserButton
                                userId={u.id}
                                currentStatus={u.status}
                                userName={u.full_name}
                              />
                              <DeleteUserButton
                                userId={u.id}
                                userName={u.full_name}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Listing Moderation ──────────────────────────────────────────── */}
        <section id="admin-listings" className="space-y-4">
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-warning" />
            <h2 className="text-lg font-bold tracking-tight">
              Listing Moderation
              <span className="ml-2 text-sm font-normal text-muted-foreground">({data.tasks.length} active)</span>
            </h2>
          </div>

          {data.tasks.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No active listings to moderate.</p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-semibold">Task</th>
                      <th className="px-4 py-3 text-left font-semibold">Category</th>
                      <th className="px-4 py-3 text-left font-semibold">Poster</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Budget</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.tasks.map((t) => (
                      <tr key={t.id} id={`task-row-${t.id}`} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/tasks/${t.id}`}
                            className="font-medium hover:underline text-foreground line-clamp-1 max-w-[220px] block"
                          >
                            {t.title}
                          </Link>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(t.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t.category}</td>
                        <td className="px-4 py-3 text-xs">{t.poster_name}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              t.status === "open"
                                ? "accent"
                                : t.status === "disputed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] capitalize"
                          >
                            {t.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-accent">
                          {formatINR(t.budget)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ModerateTaskButton taskId={t.id} taskTitle={t.title} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ── User Feedback ───────────────────────────────────────────────── */}
        <section id="admin-feedback" className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-secondary" />
            <h2 className="text-lg font-bold tracking-tight">
              User Feedback
              <span className="ml-2 text-sm font-normal text-muted-foreground">({feedback.length})</span>
            </h2>
          </div>

          {feedback.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              <MessageSquare className="size-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No feedback submitted yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {feedback.map((f) => (
                <div key={f.id} className="rounded-xl border bg-card p-4 shadow-soft space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{f.name}</p>
                      {f.email && (
                        <p className="text-[11px] text-muted-foreground truncate">{f.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < f.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed rounded-lg bg-muted/40 p-3">
                    &ldquo;{f.message}&rdquo;
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(f.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Analytics Summary ───────────────────────────────────────────── */}
        <section id="admin-analytics" className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-success" />
            <h2 className="text-lg font-bold tracking-tight">Platform Health</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-soft space-y-3">
              <h3 className="text-sm font-semibold">Dispute Resolution Rate</h3>
              {data.disputes.length === 0 ? (
                <p className="text-2xl font-extrabold text-muted-foreground">N/A</p>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-success">
                    {Math.round((resolvedDisputes.length / data.disputes.length) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {resolvedDisputes.length} of {data.disputes.length} disputes resolved
                  </p>
                </>
              )}
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-soft space-y-3">
              <h3 className="text-sm font-semibold">Active User Rate</h3>
              {data.users.length === 0 ? (
                <p className="text-2xl font-extrabold text-muted-foreground">N/A</p>
              ) : (
                <>
                  <p className="text-2xl font-extrabold text-primary">
                    {Math.round(
                      (data.users.filter((u) => u.status === "active").length /
                        data.users.length) *
                        100
                    )}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.users.filter((u) => u.status === "active").length} of{" "}
                    {data.users.length} users active
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
