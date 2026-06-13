"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploader, type UploadedFile } from "@/components/shared/file-uploader";
import { submitWork } from "../actions";
import { uploadAttachment } from "@/lib/upload-action";

interface SubmitWorkFormProps {
  taskId: string;
}

export function SubmitWorkForm({ taskId }: SubmitWorkFormProps) {
  const [content, setContent] = React.useState("");
  const [attachments, setAttachments] = React.useState<UploadedFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAttachment(fd, "deliverables");
    if (result.ok) {
      setAttachments((prev) => [
        ...prev,
        { name: result.name, url: result.url, size: result.size, type: result.type },
      ]);
    }
    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanContent = content.trim();

    if (!cleanContent && attachments.length === 0) {
      toast.error("Please describe your deliverables or attach files.");
      return;
    }

    setLoading(true);
    try {
      const fileUrls = attachments.map((f) => f.url);
      const result = await submitWork(taskId, cleanContent, fileUrls);
      if (result.ok) {
        toast.success("Deliverables submitted successfully!");
        setContent("");
        setAttachments([]);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit work.");
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t">
      <div className="space-y-1.5">
        <label
          htmlFor="deliverable-content"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Work Deliverables
        </label>
        <textarea
          id="deliverable-content"
          placeholder="Describe your deliverables, include links to Google Docs, GitHub, Figma, etc. (optional if you're attaching files)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          disabled={loading}
          className="flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <FileUploader
        label="Attach files"
        hint="Upload your deliverables — PDFs, images, docs, zip — max 10 MB each"
        files={attachments}
        onUpload={handleUpload}
        onRemove={(url) => setAttachments((prev) => prev.filter((f) => f.url !== url))}
        maxFiles={5}
        disabled={loading}
      />

      <Button
        type="submit"
        disabled={loading || (!content.trim() && attachments.length === 0)}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1.5" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="size-4 mr-1.5" />
            Submit Work
          </>
        )}
      </Button>
    </form>
  );
}
