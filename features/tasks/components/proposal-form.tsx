"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProposalSchema, type CreateProposalInput } from "../schema";
import { submitProposal } from "../proposals-actions";

interface ProposalFormProps {
  taskId: string;
  defaultBudgetRupees: number;
  onSuccess?: () => void;
}

export function ProposalForm({ taskId, defaultBudgetRupees, onSuccess }: ProposalFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  // Set default deadline to 2 days from now
  const defaultDeadline = React.useMemo(() => {
    const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    // Format to yyyy-MM-ddThh:mm for datetime-local input
    return d.toISOString().slice(0, 16);
  }, []);

  const form = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema),
    mode: "onTouched",
    defaultValues: {
      bidAmountRupees: defaultBudgetRupees,
      message: "",
      estimatedDelivery: defaultDeadline as unknown as Date,
    },
  });

  const { register, handleSubmit, formState } = form;

  async function onSubmit(data: CreateProposalInput) {
    setSubmitting(true);
    const result = await submitProposal(taskId, data);
    if (result.ok) {
      toast.success("Proposal submitted! 🎉");
      router.refresh();
      onSuccess?.();
    } else {
      toast.error("Couldn't submit proposal", { description: result.error });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bidAmountRupees">Your Bid (₹)</Label>
        <Input
          id="bidAmountRupees"
          type="number"
          min={10}
          max={100000}
          step={10}
          {...register("bidAmountRupees")}
        />
        <p className="text-xs text-muted-foreground">
          Propose your price for the task.
        </p>
        {formState.errors.bidAmountRupees && (
          <p className="text-xs text-destructive">
            {formState.errors.bidAmountRupees.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="estimatedDelivery">Estimated Delivery Time</Label>
        <Input
          id="estimatedDelivery"
          type="datetime-local"
          {...register("estimatedDelivery")}
        />
        {formState.errors.estimatedDelivery && (
          <p className="text-xs text-destructive">
            {formState.errors.estimatedDelivery.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message to Poster</Label>
        <textarea
          id="message"
          rows={4}
          placeholder="Explain why you're a good fit, ask questions, or propose your approach..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          {...register("message")}
        />
        {formState.errors.message && (
          <p className="text-xs text-destructive">
            {formState.errors.message.message}
          </p>
        )}
      </div>

      <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
        Submit Proposal
      </Button>
    </form>
  );
}
