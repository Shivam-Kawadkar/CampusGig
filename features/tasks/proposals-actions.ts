"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { holdEscrowForProposal, refundEscrowForTask } from "@/lib/payments/escrow";
import { createProposalSchema, type CreateProposalInput } from "./schema";

export type SubmitProposalResult =
  | { ok: true; proposalId: string }
  | { ok: false; error: string };

export type AcceptProposalResult =
  | { ok: true }
  | { ok: false; error: string };

/** Workers submit a proposal to complete a task. */
export async function submitProposal(
  taskId: string,
  input: CreateProposalInput
): Promise<SubmitProposalResult> {
  const parsed = createProposalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to submit a proposal." };
  }

  // Fetch the task to verify eligibility
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("poster_id, status")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.status !== "open") {
    return { ok: false, error: "This task is no longer open for proposals." };
  }

  if (task.poster_id === user.id) {
    return { ok: false, error: "You cannot bid on your own task." };
  }

  const { bidAmountRupees, message, estimatedDelivery } = parsed.data;

  // Insert the proposal
  const { data: proposal, error: insertErr } = await supabase
    .from("applications")
    .insert({
      task_id: taskId,
      worker_id: user.id,
      bid_amount: Math.round(bidAmountRupees * 100), // convert rupees to paise
      message: message || null,
      estimated_delivery: estimatedDelivery.toISOString(),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !proposal) {
    if (insertErr?.code === "23505") {
      return { ok: false, error: "You have already submitted a proposal for this task." };
    }
    return { ok: false, error: insertErr?.message ?? "Could not submit proposal." };
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/my-work");
  return { ok: true, proposalId: proposal.id };
}

/** Posters accept a worker's proposal for their task. */
export async function acceptProposal(
  taskId: string,
  proposalId: string
): Promise<AcceptProposalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to accept a proposal." };
  }

  // Fetch task & proposal to verify ownership and compatibility
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("title, poster_id, status")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.poster_id !== user.id) {
    return { ok: false, error: "You are not authorized to accept proposals for this task." };
  }

  if (task.status !== "open") {
    return { ok: false, error: "Only open tasks can accept proposals." };
  }

  const { data: proposal, error: proposalErr } = await supabase
    .from("applications")
    .select("id, worker_id, status, bid_amount")
    .eq("id", proposalId)
    .eq("task_id", taskId)
    .single();

  if (proposalErr || !proposal) {
    return { ok: false, error: "Proposal not found." };
  }

  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal is no longer pending." };
  }

  const bidAmount = Number(proposal.bid_amount);

  // Fund escrow from poster wallet before locking the task
  const holdResult = await holdEscrowForProposal(
    taskId,
    proposalId,
    user.id,
    bidAmount
  );
  if (!holdResult.ok) {
    return { ok: false, error: holdResult.error };
  }

  // Update proposal status to accepted
  const { error: acceptErr } = await supabase
    .from("applications")
    .update({ status: "accepted" })
    .eq("id", proposalId);

  if (acceptErr) {
    await refundEscrowForTask(taskId);
    return { ok: false, error: acceptErr.message };
  }

  // Fetch all pending applications first to notify rejected applicants before we batch reject them
  const { data: otherApps } = await supabase
    .from("applications")
    .select("worker_id")
    .eq("task_id", taskId)
    .neq("id", proposalId)
    .eq("status", "pending");

  // Update other pending proposals to rejected
  const { error: rejectErr } = await supabase
    .from("applications")
    .update({ status: "rejected" })
    .eq("task_id", taskId)
    .neq("id", proposalId)
    .eq("status", "pending");

  if (rejectErr) {
    console.error("Failed to reject other applications: ", rejectErr);
  }

  // Assign worker and lock task to in_progress status
  const { error: taskUpdateErr } = await supabase
    .from("tasks")
    .update({
      status: "in_progress",
      selected_worker_id: proposal.worker_id,
    })
    .eq("id", taskId);

  if (taskUpdateErr) {
    await supabase
      .from("applications")
      .update({ status: "pending" })
      .eq("id", proposalId);
    await refundEscrowForTask(taskId);
    return { ok: false, error: taskUpdateErr.message };
  }

  // 1. Create a chat room for this task
  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .insert({
      task_id: taskId,
      poster_id: user.id,
      worker_id: proposal.worker_id,
    })
    .select("id")
    .maybeSingle();

  if (chatErr) {
    console.error("Failed to create chat room: ", chatErr);
  }

  // 2. Create Notifications
  const notificationsToInsert: Array<{
    user_id: string;
    type: string;
    title: string;
    body: string;
    payload: Record<string, any>;
  }> = [
    // For worker
    {
      user_id: proposal.worker_id,
      type: "proposal_accepted",
      title: "Proposal Accepted! 🎉",
      body: `Your proposal for "${task.title}" was accepted. Click Chat to coordinate details.`,
      payload: { task_id: taskId, chat_id: chat?.id },
    },
    // For poster
    {
      user_id: user.id,
      type: "proposal_accepted_poster",
      title: "Worker Hired! 🤝",
      body: `You hired a worker for "${task.title}". A chat room has been created.`,
      payload: { task_id: taskId, chat_id: chat?.id },
    },
  ];

  // For other rejected applicants
  if (otherApps && otherApps.length > 0) {
    otherApps.forEach((app) => {
      notificationsToInsert.push({
        user_id: app.worker_id,
        type: "proposal_rejected",
        title: "Proposal Update",
        body: `The task "${task.title}" has selected another candidate.`,
        payload: { task_id: taskId },
      });
    });
  }

  const { error: notifErr } = await supabase
    .from("notifications")
    .insert(notificationsToInsert);

  if (notifErr) {
    console.error("Failed to insert notifications: ", notifErr);
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/my-tasks");
  revalidatePath("/my-work");
  revalidatePath("/chat");
  revalidatePath("/notifications");
  revalidatePath("/wallet");

  return { ok: true };
}
