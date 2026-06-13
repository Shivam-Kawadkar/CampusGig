import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Sparkles, Trophy, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { GoogleButton } from "@/features/auth/components/google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  const isSuspended = error === "suspended";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-brand p-12 text-primary-foreground lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <Link href="/" className="relative">
          <Image
            src="/logo.png"
            alt="CampusGig"
            width={170}
            height={69}
            priority
            className="h-10 w-auto brightness-0 invert"
          />
        </Link>

        <div className="relative my-auto max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">
            Earn with your skills. Build your campus reputation.
          </h1>
          <ul className="mt-8 space-y-4 text-base opacity-95">
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0" />
              Escrow-protected payments — get paid safely
            </li>
            <li className="flex items-center gap-3">
              <Trophy className="size-5 shrink-0" />
              Climb the leaderboard and earn achievement badges
            </li>
            <li className="flex items-center gap-3">
              <Sparkles className="size-5 shrink-0" />
              Verified students only — a network you can trust
            </li>
          </ul>
        </div>

        <p className="relative text-sm opacity-80">
          Skills to earn, tasks to complete.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>

          {/* Suspension banner */}
          {isSuspended && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
              <AlertTriangle className="size-4 mt-0.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Account Suspended</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Your account has been suspended by an admin. Please contact support if you think this is a mistake.
                </p>
              </div>
            </div>
          )}

          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome to CampusGig
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your student Google account to continue.
            </p>
          </div>

          <div className="mt-8">
            <GoogleButton redirectTo={redirect} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <Link href="#" className="underline hover:text-foreground">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Just browsing?{" "}
            <Link href="/tasks" className="font-medium text-primary hover:underline">
              Explore tasks
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
