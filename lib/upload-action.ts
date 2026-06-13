"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadFile } from "@/lib/storage";

export type FileUploadResult =
  | { ok: true; url: string; name: string; size: number; type: string }
  | { ok: false; error: string };

/**
 * Server action: receives a single file via FormData, uploads it to
 * Supabase Storage under the given folder, and returns the public URL.
 */
export async function uploadAttachment(
  formData: FormData,
  folder: "task-attachments" | "deliverables"
): Promise<FileUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file provided." };

  const result = await uploadFile(file, folder, user.id);
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    url: result.url,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}
