"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

interface EmailAuthFormProps {
  redirectTo?: string;
}

export function EmailAuthForm({ redirectTo }: EmailAuthFormProps) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (!isSupabaseConfigured) {
      toast.error("Authentication isn't configured yet", {
        description: "Add your Supabase keys to .env.local to enable email sign-in.",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const params = new URLSearchParams();
      if (redirectTo) params.set("redirect", redirectTo);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?${params.toString()}`,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setSent(true);
    } catch (err) {
      toast.error("Couldn't send link", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-5 py-6 text-center space-y-3">
        <div className="flex justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-6 text-primary" />
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm">Check your inbox</p>
          <p className="text-xs text-muted-foreground mt-1">
            We sent a magic link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click it to sign in — no password needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email-signin">Email address</Label>
        <Input
          id="email-signin"
          type="email"
          placeholder="you@gmail.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={loading || !email.trim()}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mail className="size-4" />
        )}
        {loading ? "Sending…" : "Continue with Email"}
      </Button>
    </form>
  );
}
