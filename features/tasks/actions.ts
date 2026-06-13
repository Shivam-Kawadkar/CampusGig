"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTaskSchema, type CreateTaskInput } from "./schema";

export type CreateTaskResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string };

/** Creates a task owned by the current user. Budget rupees → integer paise. */
export async function createTask(
  input: CreateTaskInput
): Promise<CreateTaskResult> {
  const parsed = createTaskSchema.safeParse(input);
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
  if (!user) return { ok: false, error: "You must be signed in to post a task." };

  const { title, description, categorySlug, budgetRupees, deadline, skills, attachmentUrls } =
    parsed.data;

  // Resolve category slug → id.
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) return { ok: false, error: "Invalid category." };

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      poster_id: user.id,
      title,
      description,
      category_id: category.id,
      budget: Math.round(budgetRupees * 100), // integer paise
      deadline: deadline.toISOString(),
      skills,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !task) {
    return { ok: false, error: error?.message ?? "Could not create task." };
  }

  // Insert any uploaded attachments into task_attachments table.
  if (attachmentUrls.length > 0) {
    const attachmentRows = attachmentUrls.map((url) => ({
      task_id: task.id,
      file_url: url,
      uploaded_by: user.id,
    }));

    const { error: attachErr } = await supabase
      .from("task_attachments")
      .insert(attachmentRows);

    if (attachErr) {
      console.error("Failed to insert task attachments:", attachErr);
      // Non-fatal — task is created, just log the error
    }
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return { ok: true, taskId: task.id };
}
