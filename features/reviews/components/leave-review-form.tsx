"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Loader2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "../actions";

interface LeaveReviewFormProps {
  taskId: string;
  revieweeId: string;
  revieweeName: string;
  roleContext: "poster_to_worker" | "worker_to_poster";
}

export function LeaveReviewForm({
  taskId,
  revieweeId,
  revieweeName,
  roleContext,
}: LeaveReviewFormProps) {
  const [rating, setRating] = React.useState(0);
  const [hoverRating, setHoverRating] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating of at least 1 star.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitReview(taskId, revieweeId, rating, comment, roleContext);
      if (result.ok) {
        toast.success("Review submitted successfully! Thank you.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit review.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Award className="size-5 text-warning" />
        <h3 className="text-sm font-bold tracking-tight">Leave a Review</h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Rate your experience working with <span className="font-semibold text-foreground">{revieweeName}</span>. Your rating will help establish their campus reputation.
      </p>

      {/* Star Selector */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          Your Rating
        </span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((starValue) => {
            const isFilled = (hoverRating || rating) >= starValue;
            return (
              <button
                key={starValue}
                type="button"
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={loading}
                className="p-0.5 hover:scale-110 transition-transform focus:outline-none"
              >
                <Star
                  className={`size-6 transition-colors ${
                    isFilled
                      ? "fill-warning text-warning"
                      : "text-muted hover:text-warning"
                  }`}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="text-xs font-semibold text-warning ml-1.5">
              {rating} {rating === 1 ? "Star" : "Stars"}
            </span>
          )}
        </div>
      </div>

      {/* Review Comment text field */}
      <div className="space-y-1.5">
        <label htmlFor="review-comment" className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          Review Comments
        </label>
        <textarea
          id="review-comment"
          placeholder="Share some feedback about their communication, responsiveness, quality of work, or reliability..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          disabled={loading}
          className="flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin mr-1.5" />
            Submitting Review...
          </>
        ) : (
          "Submit Feedback"
        )}
      </Button>
    </form>
  );
}
