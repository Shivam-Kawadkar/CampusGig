"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitWork } from "../actions";

interface SubmitWorkFormProps {
  taskId: string;
}

export function SubmitWorkForm({ taskId }: SubmitWorkFormProps) {
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent) {
      toast.error("Please describe your deliverables.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitWork(taskId, cleanContent);
      if (result.ok) {
        toast.success("Deliverables submitted successfully!");
        setContent("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit work.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-3 border-t">
      <div className="space-y-1.5">
        <label htmlFor="deliverable-content" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Work Deliverables
        </label>
        <textarea
          id="deliverable-content"
          placeholder="Describe your deliverables (include links to Google Docs, GitHub, Figma, etc.)..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          disabled={loading}
          className="flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
      <Button type="submit" disabled={loading || !content.trim()} className="w-full">
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
