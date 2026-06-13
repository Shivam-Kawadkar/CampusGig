"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveWork, requestRevision } from "../actions";

interface Submission {
  id: string;
  content: string;
  status: string;
  feedback: string | null;
  created_at: string;
}

interface ReviewDeliverablesProps {
  submission: Submission;
  isPoster: boolean;
}

export function ReviewDeliverables({ submission, isPoster }: ReviewDeliverablesProps) {
  const [feedback, setFeedback] = React.useState("");
  const [showRevisionForm, setShowRevisionForm] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<"approve" | "revision" | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setActionLoading("approve");
    try {
      const result = await approveWork(submission.id);
      if (result.ok) {
        toast.success("Work submission approved and completed!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to approve work.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevision(e: React.FormEvent) {
    e.preventDefault();
    const cleanFeedback = feedback.trim();
    if (!cleanFeedback) {
      toast.error("Please provide revision feedback.");
      return;
    }

    setActionLoading("revision");
    try {
      const result = await requestRevision(submission.id, cleanFeedback);
      if (result.ok) {
        toast.success("Revision request sent successfully.");
        setShowRevisionForm(false);
        setFeedback("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to request revision.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setActionLoading(null);
    }
  }

  const isPendingApproval = submission.status === "submitted";

  return (
    <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight">Latest Submission</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
          submission.status === "approved"
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
            : submission.status === "revision_requested"
              ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
              : "bg-warning/15 text-warning-foreground"
        }`}>
          {submission.status.replace("_", " ")}
        </span>
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 shadow-sm">
        {submission.content}
      </div>

      {submission.feedback && (
        <div className="space-y-1 bg-muted/40 border border-dashed rounded-lg p-3.5 text-xs">
          <p className="font-semibold text-muted-foreground">Poster Feedback:</p>
          <p className="italic text-foreground/70">{submission.feedback}</p>
        </div>
      )}

      {isPoster && isPendingApproval && (
        <div className="space-y-4 pt-2">
          {!showRevisionForm ? (
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="flex-1"
              >
                {actionLoading === "approve" ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="size-4 mr-1.5" />
                )}
                Approve Work
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
                disabled={actionLoading !== null}
                className="flex-1 border-destructive text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <AlertTriangle className="size-4 mr-1.5" />
                Request Revision
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRevision} className="space-y-3 pt-2 border-t border-dashed">
              <div className="space-y-1.5">
                <label htmlFor="revision-feedback" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Revision Feedback
                </label>
                <textarea
                  id="revision-feedback"
                  placeholder="Explain exactly what needs to be changed or fixed..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  disabled={actionLoading !== null}
                  className="flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="flex gap-2.5">
                <Button
                  type="submit"
                  disabled={actionLoading !== null || !feedback.trim()}
                  className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/95"
                >
                  {actionLoading === "revision" ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : (
                    <AlertTriangle className="size-4 mr-1.5" />
                  )}
                  Send Request
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setFeedback("");
                  }}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
