"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Check, CircleDollarSign, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/components/shared/rating-stars";
import { formatINR, initials } from "@/lib/utils";
import { acceptProposal } from "../proposals-actions";

export interface ProposalDetail {
  id: string;
  bidAmount: number;
  message: string | null;
  estimatedDelivery: string;
  status: string;
  worker: {
    id: string;
    name: string;
    avatarUrl?: string;
    college: string;
    ratingAvg: number;
    ratingCount: number;
  };
}

interface ProposalsListProps {
  taskId: string;
  proposals: ProposalDetail[];
  isTaskOpen: boolean;
}

export function ProposalsList({ taskId, proposals, isTaskOpen }: ProposalsListProps) {
  const router = useRouter();
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null);

  async function handleAccept(proposalId: string) {
    if (!confirm("Are you sure you want to accept this proposal and hire this worker?")) {
      return;
    }
    setAcceptingId(proposalId);
    const result = await acceptProposal(taskId, proposalId);
    if (result.ok) {
      toast.success("Worker hired successfully! 🎉");
      router.refresh();
    } else {
      toast.error("Could not accept proposal", { description: result.error });
      setAcceptingId(null);
    }
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground bg-card">
        <p className="font-medium text-foreground/80">No proposals received yet.</p>
        <p className="mt-1 text-sm">We&apos;ll notify you when students start bidding on your task.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal) => {
        const isPending = proposal.status === "pending";
        return (
          <div
            key={proposal.id}
            className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-soft md:flex-row md:items-start md:justify-between"
          >
            <div className="flex items-start gap-3.5">
              <Avatar className="h-10 w-10">
                <AvatarImage src={proposal.worker.avatarUrl} alt={proposal.worker.name} />
                <AvatarFallback>{initials(proposal.worker.name)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{proposal.worker.name}</h4>
                  <span className="text-xs text-muted-foreground">
                    · {proposal.worker.college}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RatingStars rating={proposal.worker.ratingAvg} size={13} />
                  <span>({proposal.worker.ratingCount} reviews)</span>
                </div>
                {proposal.message && (
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/85">
                    {proposal.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-row items-end justify-between border-t pt-4 md:flex-col md:items-end md:justify-start md:border-none md:pt-0 gap-4">
              <div className="text-left md:text-right space-y-1.5">
                <div className="flex items-center gap-1 text-accent font-bold text-lg">
                  <CircleDollarSign className="size-4.5" />
                  {formatINR(proposal.bidAmount)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>
                    Delivers by:{" "}
                    {new Date(proposal.estimatedDelivery).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>

              {isTaskOpen && isPending && (
                <Button
                  size="sm"
                  variant="brand"
                  disabled={acceptingId !== null}
                  onClick={() => handleAccept(proposal.id)}
                >
                  {acceptingId === proposal.id && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Accept & Hire
                </Button>
              )}

              {!isPending && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {proposal.status}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
