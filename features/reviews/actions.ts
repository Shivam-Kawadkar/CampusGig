"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ReviewResult {
  ok: boolean;
  error?: string;
}

export async function submitReview(
  taskId: string,
  revieweeId: string,
  rating: number,
  comment: string,
  roleContext: "poster_to_worker" | "worker_to_poster"
): Promise<ReviewResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to submit a review." };
  }

  const cleanRating = Math.round(rating);
  if (cleanRating < 1 || cleanRating > 5) {
    return { ok: false, error: "Rating must be between 1 and 5 stars." };
  }

  // 1. Verify that the task is completed
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("status, poster_id, selected_worker_id")
    .eq("id", taskId)
    .single();

  if (taskErr || !task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.status !== "completed") {
    return { ok: false, error: "Reviews can only be submitted for completed tasks." };
  }

  // 2. Validate role relationship
  if (roleContext === "poster_to_worker") {
    if (task.poster_id !== user.id) {
      return { ok: false, error: "You are not the poster of this task." };
    }
    if (task.selected_worker_id !== revieweeId) {
      return { ok: false, error: "Reviewee is not the worker selected for this task." };
    }
  } else if (roleContext === "worker_to_poster") {
    if (task.selected_worker_id !== user.id) {
      return { ok: false, error: "You are not the worker selected for this task." };
    }
    if (task.poster_id !== revieweeId) {
      return { ok: false, error: "Reviewee is not the poster of this task." };
    }
  } else {
    return { ok: false, error: "Invalid review context." };
  }

  // 3. Insert review
  const { error: reviewErr } = await supabase
    .from("reviews")
    .insert({
      task_id: taskId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: cleanRating,
      comment: comment.trim() || null,
      role_context: roleContext,
    });

  if (reviewErr) {
    // Check if unique key violated
    if (reviewErr.code === "23505") {
      return { ok: false, error: "You have already reviewed this participant for this task." };
    }
    return { ok: false, error: reviewErr.message };
  }

  // 4. Send notification to the reviewee
  const { error: notifErr } = await supabase
    .from("notifications")
    .insert({
      user_id: revieweeId,
      type: "review_received",
      title: "New Review Received! ⭐",
      body: `You received a ${cleanRating}-star rating from your campus peer.`,
      payload: { task_id: taskId }
    });

  if (notifErr) {
    console.error("Failed to insert notification: ", notifErr);
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/profile/${revieweeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  revalidatePath("/leaderboard");

  return { ok: true };
}
