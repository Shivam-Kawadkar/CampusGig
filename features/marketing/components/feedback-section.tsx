import { FadeIn } from "@/components/motion/fade-in";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { FeedbackForm } from "./feedback-form";

export function FeedbackSection() {
  return (
    <section id="feedback" className="relative overflow-hidden py-20 lg:py-28">
      <AuroraBackground className="opacity-60" />
      <div className="container relative">
        <FadeIn className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            💬 We&apos;re listening
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Help shape <span className="text-gradient-brand">CampusGig</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Got an idea, a bug, or just some love? Drop us a line — every bit
            helps us build a better campus marketplace.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <FeedbackForm />
        </FadeIn>
      </div>
    </section>
  );
}
