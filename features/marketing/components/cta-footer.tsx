import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export function CtaFooter() {
  return (
    <>
      {/* Final CTA */}
      <section className="container py-20">
        <FadeIn className="relative overflow-hidden rounded-2xl bg-gradient-brand px-8 py-14 text-center text-primary-foreground shadow-lift">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <h2 className="relative text-3xl font-bold sm:text-4xl">
            Ready to earn with your skills?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md opacity-90">
            Join your campus marketplace today. It takes less than a minute to
            get started.
          </p>
          <Button asChild size="lg" variant="secondary" className="relative mt-7">
            <Link href="/login">
              Continue with Google
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container flex flex-col gap-8 py-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              A trusted student skill marketplace. Earn, learn, and build your
              campus reputation.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-8 text-sm">
            <FooterCol
              title="Product"
              links={["Browse tasks", "Leaderboard", "How it works"]}
            />
            <FooterCol
              title="Company"
              links={["About", "Careers", "Contact"]}
            />
            <FooterCol
              title="Legal"
              links={["Privacy", "Terms", "Trust & safety"]}
            />
          </div>
        </div>
        <div className="border-t py-6">
          <p className="container text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} CampusGig. Built for students, by
            students.
          </p>
        </div>
      </footer>
    </>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <ul className="mt-3 space-y-2 text-muted-foreground">
        {links.map((l) => (
          <li key={l}>
            <Link href="#" className="transition-colors hover:text-foreground">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
