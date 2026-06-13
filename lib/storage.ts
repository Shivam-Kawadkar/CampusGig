import "server-only";
import { createClient } from "@/lib/supabase/server";

export type UploadResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

const BUCKET = "campusgig-uploads";
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
];

/**
 * Uploads a file to Supabase Storage under a scoped path.
 * Returns a signed public URL valid indefinitely (bucket must be public)
 * or a time-limited signed URL if the bucket is private.
 *
 * @param file    The File object (from FormData or FileList)
 * @param folder  Storage folder prefix e.g. "task-attachments" | "deliverables"
 * @param userId  Owner's user ID — used to scope the path
 */
export async function uploadFile(
  file: File,
  folder: "task-attachments" | "deliverables",
  userId: string
): Promise<UploadResult> {
  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File too large. Max ${MAX_FILE_SIZE_MB} MB allowed.` };
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: `Unsupported file type: ${file.type || "unknown"}. Upload PDFs, images, docs, or zip files.`,
    };
  }

  const supabase = await createClient();

  // Build a unique path: folder/userId/timestamp-filename
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${userId}/${Date.now()}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  // Get the public URL (bucket must be set to public in Supabase dashboard)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { ok: true, url: data.publicUrl, path };
}

/**
 * Deletes a previously uploaded file by its storage path.
 */
export async function deleteFile(path: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
