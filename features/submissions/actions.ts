"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatINR } from "@/lib/utils";
import { calcCommission } from "@/lib/payments/constants";
import { releaseEscrowForTask } from "@/lib/payments/escrow";

export interface SubmissionResult {
  ok: boolean;
  error?: string;
}

export async function submitWork(
  taskId: string,
  content: string,
  fileUrls: string[] = []
): Promise<SubmissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to submit work." };
  }

  // 1. Fetch task to verify role
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("title, poster_id, selected_worker_id, status")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.selected_worker_id !== user.id) {
    return { ok: false, error: "You are not the selected worker for this task." };
  }

  if (!["in_progress", "submitted"].includes(task.status)) {
    return { ok: false, error: "Task is not in a submittable state." };
  }

  // 2. Insert submission deliverable
  const { error: subErr } = await supabase
    .from("submissions")
    .insert({
      task_id: taskId,
      worker_id: user.id,
      content,
      file_urls: fileUrls,
      status: "submitted"
    });

  if (subErr) {
    return { ok: false, error: subErr.message };
  }

  // 3. Update task status to submitted (using admin client to bypass RLS since worker has no update access to tasks table)
  const adminSupabase = createAdminClient();
  const { error: taskUpdateErr } = await adminSupabase
    .from("tasks")
    .update({ status: "submitted" })
    .eq("id", taskId);

  if (taskUpdateErr) {
    return { ok: false, error: taskUpdateErr.message };
  }

  // 4. Send notification to the poster
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert({
      user_id: task.poster_id,
      type: "work_submitted",
      title: "Work Submitted! 🚀",
      body: `Worker submitted deliverables for "${task.title}". Review and approve them.`,
      payload: { task_id: taskId }
    });

  if (notifErr) {
    console.error("Failed to insert notification: ", notifErr);
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");

  return { ok: true };
}

export async function approveWork(
  submissionId: string,
  feedback?: string
): Promise<SubmissionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to approve work." };
  }

  // 1. Fetch submission and parent task
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("*, task:tasks(*)")
    .eq("id", submissionId)
    .single();

  if (subErr || !submission) {
    return { ok: false, error: "Submission not found." };
  }

  const task = submission.task;
  if (!task) {
    return { ok: false, error: "Associated task not found." };
  }

  if (task.poster_id !== user.id) {
    return { ok: false, error: "Only the task poster can approve submissions." };
  }

  if (task.status !== "submitted") {
    return { ok: false, error: "Task is not pending approval." };
  }

  // 2. Fetch escrow details and release escrow first
  const { data: heldPayment } = await supabase
    .from("payments")
    .select("amount, commission")
    .eq("task_id", task.id)
    .eq("escrow_status", "held")
    .maybeSingle();

  const releaseResult = await releaseEscrowForTask(task.id, task.selected_worker_id);
  if (!releaseResult.ok) {
    console.error("Escrow release failed:", releaseResult.error);
    return { ok: false, error: releaseResult.error ?? "Could not release escrow payment." };
  }

  // 3. Update submission status to approved (using admin client to bypass RLS restrictions)
  const { error: subUpdateErr } = await adminSupabase
    .from("submissions")
    .update({
      status: "approved",
      feedback
    })
    .eq("id", submissionId);

  if (subUpdateErr) {
    return { ok: false, error: subUpdateErr.message };
  }

  // 4. Update task status to completed (using admin client to bypass RLS restrictions)
  const { error: taskUpdateErr } = await adminSupabase
    .from("tasks")
    .update({ status: "completed" })
    .eq("id", task.id);

  if (taskUpdateErr) {
    return { ok: false, error: taskUpdateErr.message };
  }

  const escrowAmount = Number(heldPayment?.amount ?? task.budget);
  const workerPayout = escrowAmount - Number(heldPayment?.commission ?? calcCommission(escrowAmount));

  // 5. Send notification to the worker
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert({
      user_id: task.selected_worker_id,
      type: "proposal_completed",
      title: "Work Approved! 🎉",
      body: `Your work for "${task.title}" was approved. ${formatINR(workerPayout)} released to your wallet (escrow).`,
      payload: { task_id: task.id }
    });

  if (notifErr) {
    console.error("Failed to insert notification: ", notifErr);
  }

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/leaderboard");
  revalidatePath("/wallet");

  return { ok: true };
}

export async function requestRevision(
  submissionId: string,
  feedback: string
): Promise<SubmissionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to request revisions." };
  }

  if (!feedback.trim()) {
    return { ok: false, error: "Revision feedback cannot be empty." };
  }

  // 1. Fetch submission and parent task
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("*, task:tasks(*)")
    .eq("id", submissionId)
    .single();

  if (subErr || !submission) {
    return { ok: false, error: "Submission not found." };
  }

  const task = submission.task;
  if (!task) {
    return { ok: false, error: "Associated task not found." };
  }

  if (task.poster_id !== user.id) {
    return { ok: false, error: "Only the task poster can request revisions." };
  }

  if (task.status !== "submitted") {
    return { ok: false, error: "Task is not pending approval." };
  }

  // 2. Update submission status to revision_requested (using admin client to bypass RLS)
  const { error: subUpdateErr } = await adminSupabase
    .from("submissions")
    .update({
      status: "revision_requested",
      feedback
    })
    .eq("id", submissionId);

  if (subUpdateErr) {
    return { ok: false, error: subUpdateErr.message };
  }

  // 3. Reset task status back to in_progress (using admin client to bypass RLS)
  const { error: taskUpdateErr } = await adminSupabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", task.id);

  if (taskUpdateErr) {
    return { ok: false, error: taskUpdateErr.message };
  }

  // 4. Send notification to the worker
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert({
      user_id: task.selected_worker_id,
      type: "revision_requested",
      title: "Revision Requested ⚠️",
      body: `Poster requested revisions for "${task.title}": "${feedback}"`,
      payload: { task_id: task.id }
    });

  if (notifErr) {
    console.error("Failed to insert notification: ", notifErr);
  }

  revalidatePath(`/tasks/${task.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");

  return { ok: true };
}
