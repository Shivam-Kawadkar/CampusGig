"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";

export interface DisputeResult {
  ok: boolean;
  error?: string;
  disputeId?: string;
}

// ─── raise a dispute ────────────────────────────────────────────────────────

export async function raiseDispute(
  taskId: string,
  reason: string,
  explanation: string
): Promise<DisputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in." };
  if (!explanation.trim()) return { ok: false, error: "Explanation is required." };

  // Fetch task to verify eligibility
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("title, poster_id, selected_worker_id, status, budget")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) return { ok: false, error: "Task not found." };

  const isParty =
    task.poster_id === user.id || task.selected_worker_id === user.id;
  if (!isParty)
    return { ok: false, error: "You are not a party to this task." };

  if (!["in_progress", "submitted"].includes(task.status))
    return {
      ok: false,
      error: "Disputes can only be raised on in-progress or submitted tasks.",
    };

  // Check for existing dispute
  const { data: existing } = await supabase
    .from("disputes")
    .select("id")
    .eq("task_id", taskId)
    .eq("status", "opened")
    .maybeSingle();

  if (existing) return { ok: false, error: "A dispute is already open for this task." };

  // Insert dispute
  const { data: dispute, error: disputeErr } = await supabase
    .from("disputes")
    .insert({
      task_id: taskId,
      disputer_id: user.id,
      reason,
      explanation,
    })
    .select("id")
    .single();

  if (disputeErr || !dispute)
    return { ok: false, error: disputeErr?.message ?? "Failed to raise dispute." };

  // Set task status to disputed
  await supabase
    .from("tasks")
    .update({ status: "disputed" })
    .eq("id", taskId);

  // Notify both parties
  const notifyUserId =
    task.poster_id === user.id ? task.selected_worker_id : task.poster_id;

  await supabase.from("notifications").insert({
    user_id: notifyUserId,
    type: "task_disputed",
    title: "Dispute Raised ⚠️",
    body: `A dispute was filed for "${task.title}". Our team will review it.`,
    payload: { task_id: taskId, dispute_id: dispute.id },
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");

  return { ok: true, disputeId: dispute.id };
}

// ─── submit evidence ─────────────────────────────────────────────────────────

export async function submitDisputeEvidence(
  disputeId: string,
  comment: string
): Promise<DisputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in." };
  if (!comment.trim()) return { ok: false, error: "Comment cannot be empty." };

  // Verify dispute exists and is open
  const { data: dispute, error: dErr } = await supabase
    .from("disputes")
    .select("id, task_id, status")
    .eq("id", disputeId)
    .single();

  if (dErr || !dispute) return { ok: false, error: "Dispute not found." };
  if (dispute.status !== "opened")
    return { ok: false, error: "This dispute is already resolved." };

  const { error: insErr } = await supabase.from("dispute_evidence").insert({
    dispute_id: disputeId,
    submitter_id: user.id,
    comment,
  });

  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath(`/tasks/${dispute.task_id}`);
  revalidatePath("/admin");

  return { ok: true };
}

// ─── resolve dispute (admin only) ───────────────────────────────────────────

export async function resolveDispute(
  disputeId: string,
  decision: "payout_worker" | "refund_poster" | "split" | "cancelled",
  details: string
): Promise<DisputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in." };

  // Verify admin
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userRow?.role !== "admin")
    return { ok: false, error: "Only admins can resolve disputes." };

  // Fetch dispute + task details
  const { data: dispute, error: dErr } = await supabase
    .from("disputes")
    .select("id, task_id, disputer_id, status")
    .eq("id", disputeId)
    .single();

  if (dErr || !dispute) return { ok: false, error: "Dispute not found." };
  if (dispute.status !== "opened")
    return { ok: false, error: "This dispute is already resolved." };

  const { data: task, error: tErr } = await supabase
    .from("tasks")
    .select("title, poster_id, selected_worker_id, budget")
    .eq("id", dispute.task_id)
    .single();

  if (tErr || !task) return { ok: false, error: "Task not found." };

  const budget = Number(task.budget);

  // Financial resolution
  if (decision === "payout_worker" && task.selected_worker_id) {
    // Credit full amount to worker
    const { data: wWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", task.selected_worker_id)
      .maybeSingle();

    await supabase
      .from("wallets")
      .update({ balance: (Number(wWallet?.balance) || 0) + budget })
      .eq("user_id", task.selected_worker_id);
  } else if (decision === "refund_poster") {
    // Refund full amount to poster
    const { data: pWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", task.poster_id)
      .maybeSingle();

    await supabase
      .from("wallets")
      .update({ balance: (Number(pWallet?.balance) || 0) + budget })
      .eq("user_id", task.poster_id);
  } else if (decision === "split") {
    const half = Math.floor(budget / 2);

    // Credit poster
    const { data: pWallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", task.poster_id)
      .maybeSingle();
    await supabase
      .from("wallets")
      .update({ balance: (Number(pWallet?.balance) || 0) + half })
      .eq("user_id", task.poster_id);

    // Credit worker
    if (task.selected_worker_id) {
      const { data: wWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", task.selected_worker_id)
        .maybeSingle();
      await supabase
        .from("wallets")
        .update({ balance: (Number(wWallet?.balance) || 0) + (budget - half) })
        .eq("user_id", task.selected_worker_id);
    }
  }

  // Update dispute to resolved
  await supabase
    .from("disputes")
    .update({
      status: "resolved",
      resolution_decision: decision,
      resolution_details: details,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  // Update task status
  const newTaskStatus =
    decision === "cancelled" ? "cancelled" : "completed";
  await supabase
    .from("tasks")
    .update({ status: newTaskStatus })
    .eq("id", dispute.task_id);

  // Notify both parties
  const decisionLabel: Record<string, string> = {
    payout_worker: `Worker paid ${formatINR(budget)}`,
    refund_poster: `Poster refunded ${formatINR(budget)}`,
    split: `Budget split equally (${formatINR(Math.floor(budget / 2))} each)`,
    cancelled: "Task cancelled without payment",
  };

  const notifBody = `Dispute for "${task.title}" resolved. ${decisionLabel[decision]}.`;

  const notifyIds = [task.poster_id, task.selected_worker_id].filter(Boolean);
  for (const uid of notifyIds) {
    await supabase.from("notifications").insert({
      user_id: uid,
      type: "dispute_resolved",
      title: "Dispute Resolved ✅",
      body: notifBody,
      payload: { task_id: dispute.task_id, dispute_id: disputeId },
    });
  }

  revalidatePath(`/tasks/${dispute.task_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/notifications");

  return { ok: true };
}

// ─── toggle user suspension (admin only) ────────────────────────────────────

export async function toggleUserSuspension(targetUserId: string): Promise<DisputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: callerRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerRow?.role !== "admin")
    return { ok: false, error: "Only admins can suspend users." };

  const { data: targetRow } = await supabase
    .from("users")
    .select("status")
    .eq("id", targetUserId)
    .single();

  if (!targetRow) return { ok: false, error: "User not found." };

  const newStatus = targetRow.status === "suspended" ? "active" : "suspended";

  const { error } = await supabase
    .from("users")
    .update({ status: newStatus })
    .eq("id", targetUserId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");

  return { ok: true };
}

// ─── moderate task (admin only) ─────────────────────────────────────────────

export async function moderateTask(
  taskId: string,
  newStatus: string
): Promise<DisputeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: callerRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerRow?.role !== "admin")
    return { ok: false, error: "Only admins can moderate tasks." };

  const { error } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);

  return { ok: true };
}

// ─── get admin dashboard data ────────────────────────────────────────────────

export interface AdminDashboardData {
  disputes: Array<{
    id: string;
    task_id: string;
    task_title: string;
    disputer_name: string;
    reason: string;
    explanation: string;
    status: string;
    resolution_decision?: string | null;
    created_at: string;
    budget: number;
    evidence: Array<{
      id: string;
      submitter_name: string;
      comment: string;
      created_at: string;
    }>;
  }>;
  users: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
    full_name: string;
    college: string;
    rating_avg: number;
    completed_gigs: number;
    created_at: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    budget: number;
    category: string;
    poster_name: string;
    created_at: string;
  }>;
  stats: {
    activeDisputes: number;
    totalUsers: number;
    completedTasks: number;
    totalEscrow: number;
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: callerRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerRow?.role !== "admin") return null;

  // Fetch disputes with task info
  const { data: rawDisputes } = await supabase
    .from("disputes")
    .select("id, task_id, disputer_id, reason, explanation, status, created_at")
    .order("created_at", { ascending: false });

  const disputes: AdminDashboardData["disputes"] = [];

  if (rawDisputes) {
    for (const d of rawDisputes) {
      const { data: taskRow } = await supabase
        .from("tasks")
        .select("title, budget")
        .eq("id", d.task_id)
        .maybeSingle();

      const { data: disputerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", d.disputer_id)
        .maybeSingle();

      const { data: evidenceRows } = await supabase
        .from("dispute_evidence")
        .select("id, submitter_id, comment, created_at")
        .eq("dispute_id", d.id)
        .order("created_at", { ascending: true });

      const evidenceWithNames = [];
      for (const ev of evidenceRows ?? []) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", ev.submitter_id)
          .maybeSingle();
        evidenceWithNames.push({
          id: ev.id,
          submitter_name: prof?.full_name ?? "User",
          comment: ev.comment,
          created_at: ev.created_at,
        });
      }

      disputes.push({
        id: d.id,
        task_id: d.task_id,
        task_title: taskRow?.title ?? "Unknown Task",
        disputer_name: disputerProfile?.full_name ?? "User",
        reason: d.reason,
        explanation: d.explanation,
        status: d.status,
        created_at: d.created_at,
        budget: Number(taskRow?.budget ?? 0),
        evidence: evidenceWithNames,
      });
    }
  }

  // Fetch users with profiles
  const { data: usersRaw } = await supabase
    .from("users")
    .select("id, email, role, status, created_at")
    .order("created_at", { ascending: false });

  const users: AdminDashboardData["users"] = [];

  if (usersRaw) {
    for (const u of usersRaw) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, college, rating_avg, completed_gigs")
        .eq("user_id", u.id)
        .maybeSingle();

      users.push({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        full_name: prof?.full_name ?? "Student",
        college: prof?.college ?? "—",
        rating_avg: Number(prof?.rating_avg ?? 0),
        completed_gigs: Number(prof?.completed_gigs ?? 0),
        created_at: u.created_at,
      });
    }
  }

  // Fetch tasks for moderation
  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select("id, title, status, budget, poster_id, created_at, category:task_categories(name)")
    .not("status", "in", '("cancelled","completed")')
    .order("created_at", { ascending: false })
    .limit(50);

  const tasks: AdminDashboardData["tasks"] = [];

  if (tasksRaw) {
    for (const t of tasksRaw) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", t.poster_id)
        .maybeSingle();

      tasks.push({
        id: t.id,
        title: t.title,
        status: t.status,
        budget: Number(t.budget),
        category: (() => {
          const cat = t.category as unknown;
          if (Array.isArray(cat)) return (cat as { name: string }[])[0]?.name ?? "General";
          if (cat && typeof cat === "object") return (cat as { name: string }).name ?? "General";
          return "General";
        })(),
        poster_name: prof?.full_name ?? "User",
        created_at: t.created_at,
      });
    }
  }

  // Stats
  const { count: activeDisputes } = await supabase
    .from("disputes")
    .select("*", { count: "exact", head: true })
    .eq("status", "opened");

  const { count: totalUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  const { count: completedTasks } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { data: escrowData } = await supabase
    .from("wallets")
    .select("locked_balance");

  const totalEscrow = escrowData
    ? escrowData.reduce((acc, w) => acc + Number(w.locked_balance), 0)
    : 0;

  return {
    disputes,
    users,
    tasks,
    stats: {
      activeDisputes: activeDisputes ?? 0,
      totalUsers: totalUsers ?? 0,
      completedTasks: completedTasks ?? 0,
      totalEscrow,
    },
  };
}
