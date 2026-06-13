"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { raiseDispute, submitDisputeEvidence } from "@/features/disputes/actions";

const DISPUTE_REASONS = [
  { value: "non_delivery", label: "Non-Delivery" },
  { value: "poor_quality", label: "Poor Quality" },
  { value: "scope_creep", label: "Scope Creep" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "communication", label: "Communication Breakdown" },
  { value: "other", label: "Other" },
];

// ─── File a Dispute Dialog ───────────────────────────────────────────────────

interface FileDisputeFormProps {
  taskId: string;
}

export function FileDisputeForm({ taskId }: FileDisputeFormProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("non_delivery");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await raiseDispute(taskId, reason, explanation);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
    } else {
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  if (!open) {
    return (
      <Button
        id="file-dispute-btn"
        variant="destructive"
        size="sm"
        className="w-full gap-2"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="size-4" />
        File a Dispute
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-destructive shrink-0" />
        <h3 className="font-semibold text-sm text-destructive">File a Dispute</h3>
      </div>

      {success ? (
        <div className="text-center py-4 text-sm text-success font-medium">
          ✅ Dispute filed successfully. Redirecting…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="dispute-reason" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason
            </label>
            <select
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dispute-explanation" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Explanation
            </label>
            <textarea
              id="dispute-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail…"
              required
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              className="flex-1"
              disabled={loading}
              id="submit-dispute-btn"
            >
              {loading ? "Filing…" : "Submit Dispute"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Submit Evidence Form ────────────────────────────────────────────────────

interface SubmitEvidenceFormProps {
  disputeId: string;
  taskId: string;
}

export function SubmitEvidenceForm({ disputeId, taskId }: SubmitEvidenceFormProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await submitDisputeEvidence(disputeId, comment);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
    } else {
      setSuccess(true);
      setComment("");
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 1500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" id={`evidence-form-${taskId}`}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Submit your explanation or evidence…"
        required
        className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {success && <p className="text-xs text-success">Evidence submitted ✅</p>}
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={loading}
        id="submit-evidence-btn"
      >
        {loading ? "Submitting…" : "Submit Evidence"}
      </Button>
    </form>
  );
}
