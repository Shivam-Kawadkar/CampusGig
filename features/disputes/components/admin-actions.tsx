"use client";

import { useState } from "react";
import { resolveDispute, toggleUserSuspension, moderateTask } from "@/features/disputes/actions";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";
import type { AdminDashboardData } from "@/features/disputes/actions";

// ─── Resolve Dispute Panel ───────────────────────────────────────────────────

interface ResolveDisputePanelProps {
  dispute: AdminDashboardData["disputes"][number];
}

const DECISIONS = [
  { value: "payout_worker", label: "Payout Worker", color: "bg-emerald-500 hover:bg-emerald-600" },
  { value: "refund_poster", label: "Refund Poster", color: "bg-blue-500 hover:bg-blue-600" },
  { value: "split", label: "Split 50/50", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "cancelled", label: "Cancel Task", color: "bg-destructive hover:bg-destructive/90" },
] as const;

export function ResolveDisputePanel({ dispute }: ResolveDisputePanelProps) {
  const [selected, setSelected] = useState<typeof DECISIONS[number]["value"] | null>(null);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleResolve() {
    if (!selected || !details.trim()) {
      setError("Please select a decision and provide details.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await resolveDispute(dispute.id, selected, details);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed.");
    } else {
      setDone(true);
      setTimeout(() => window.location.reload(), 1500);
    }
  }

  if (dispute.status === "resolved" || done) {
    return (
      <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3 text-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
        ✅ Dispute resolved
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Resolution — {formatINR(dispute.budget)} at stake
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DECISIONS.map((d) => (
          <button
            key={d.value}
            id={`decision-${d.value}-${dispute.id}`}
            onClick={() => setSelected(d.value)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition-all ${d.color} ${
              selected === d.value ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-[1.03]" : "opacity-80"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      {selected && (
        <div className="space-y-2">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="Add resolution summary or notes…"
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            id={`confirm-resolve-${dispute.id}`}
            size="sm"
            className="w-full"
            onClick={handleResolve}
            disabled={loading}
          >
            {loading ? "Resolving…" : `Confirm: ${DECISIONS.find((d) => d.value === selected)?.label}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Suspend User Button ─────────────────────────────────────────────────────

interface SuspendUserButtonProps {
  userId: string;
  currentStatus: string;
  userName: string;
}

export function SuspendUserButton({ userId, currentStatus, userName }: SuspendUserButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  async function handleToggle() {
    setLoading(true);
    const res = await toggleUserSuspension(userId);
    setLoading(false);
    if (res.ok) {
      setStatus((s) => (s === "suspended" ? "active" : "suspended"));
    }
  }

  return (
    <Button
      id={`suspend-user-${userId}`}
      variant={status === "suspended" ? "outline" : "destructive"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="text-xs"
    >
      {loading ? "…" : status === "suspended" ? `Activate ${userName}` : `Suspend ${userName}`}
    </Button>
  );
}

// ─── Moderate Task Button ────────────────────────────────────────────────────

interface ModerateTaskButtonProps {
  taskId: string;
  taskTitle: string;
}

export function ModerateTaskButton({ taskId, taskTitle }: ModerateTaskButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const res = await moderateTask(taskId, "cancelled");
    setLoading(false);
    if (res.ok) setDone(true);
  }

  if (done) {
    return <span className="text-xs text-muted-foreground italic">Cancelled</span>;
  }

  return (
    <Button
      id={`cancel-task-${taskId}`}
      variant="destructive"
      size="sm"
      onClick={handleCancel}
      disabled={loading}
      className="text-xs"
      title={`Cancel: ${taskTitle}`}
    >
      {loading ? "…" : "Cancel Task"}
    </Button>
  );
}
