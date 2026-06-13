"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, PartyPopper, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfettiBurst } from "@/components/motion/confetti-burst";
import { cn } from "@/lib/utils";
import { feedbackSchema, type FeedbackInput } from "@/features/feedback/schema";
import { submitFeedback } from "@/features/feedback/actions";

export function FeedbackForm() {
  const [hover, setHover] = React.useState(0);
  const [fire, setFire] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { name: "", email: "", rating: 0, message: "" },
  });

  const rating = watch("rating");

  async function onSubmit(values: FeedbackInput) {
    const res = await submitFeedback(values);
    if (!res.ok) {
      toast.error(res.error ?? "Could not send feedback");
      return;
    }
    setFire(true);
    toast.success("Thanks for the feedback! 💜");
    setDone(true);
  }

  return (
    <div className="relative mx-auto max-w-xl rounded-2xl border bg-card/70 p-6 shadow-glow backdrop-blur-sm sm:p-8">
      <ConfettiBurst fire={fire} onDone={() => setFire(false)} />

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-brand text-white shadow-glow">
              <PartyPopper className="size-7" />
            </div>
            <h3 className="text-xl font-bold">You&apos;re a legend!</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your feedback helps us make CampusGig better for every student.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit(onSubmit)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Star rating */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                How&apos;s your experience?
              </span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.2, rotate: -8 }}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() =>
                      setValue("rating", n, { shouldValidate: true })
                    }
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "size-8 transition-colors",
                        (hover || rating) >= n
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/40"
                      )}
                    />
                  </motion.button>
                ))}
              </div>
              {errors.rating && (
                <p className="text-xs text-destructive">{errors.rating.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input placeholder="Your name" {...register("name")} />
                {errors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <textarea
                {...register("message")}
                rows={4}
                placeholder="Tell us what you love or what we can improve…"
                className="w-full resize-none rounded-lg border border-input bg-muted/40 p-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
              />
              {errors.message && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.message.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Send feedback
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
