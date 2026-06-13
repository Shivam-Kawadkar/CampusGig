import { redirect } from "next/navigation";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  TrendingUp,
  Coins,
  BadgeCheck,
  ArrowDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { FadeIn } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { TopUpSimulator, WithdrawSimulator } from "@/features/wallet/components/top-up-simulator";

export const metadata = {
  title: "Wallet | CampusGig",
  description: "Manage your CampusGig wallet, track earnings and spending",
};

// ── Transaction type helper ───────────────────────────────────────────────────

type TxType = "earned" | "spent" | "refund" | "topup";

interface Transaction {
  id: string;
  type: TxType;
  label: string;
  sublabel: string;
  amount: number; // paise — positive = credit, negative = debit
  date: string;
}

const TX_META: Record<TxType, { icon: React.ElementType; color: string; bg: string }> = {
  earned:  { icon: ArrowDownLeft, color: "text-success",     bg: "bg-success/10" },
  spent:   { icon: ArrowUpRight,  color: "text-destructive", bg: "bg-destructive/10" },
  refund:  { icon: ArrowDownLeft, color: "text-primary",     bg: "bg-primary/10" },
  topup:   { icon: Coins,         color: "text-accent",      bg: "bg-accent/10" },
};

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // 1. Wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, locked_balance, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const balance = Number(wallet?.balance ?? 0);
  const lockedBalance = Number(wallet?.locked_balance ?? 0);
  const totalBalance = balance + lockedBalance;

  // 2. Completed tasks where user was the worker → earnings
  const { data: earnedTasks } = await supabase
    .from("tasks")
    .select("id, title, budget, updated_at")
    .eq("selected_worker_id", user.id)
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  // 3. Completed tasks where user was the poster → spending
  const { data: spentTasks } = await supabase
    .from("tasks")
    .select("id, title, budget, updated_at")
    .eq("poster_id", user.id)
    .eq("status", "completed")
    .order("updated_at", { ascending: false });

  // 4. Build a unified transaction ledger
  const transactions: Transaction[] = [
    ...(earnedTasks ?? []).map((t) => ({
      id: `earn-${t.id}`,
      type: "earned" as TxType,
      label: "Gig Payout",
      sublabel: t.title,
      amount: Number(t.budget),
      date: t.updated_at,
    })),
    ...(spentTasks ?? []).map((t) => ({
      id: `spent-${t.id}`,
      type: "spent" as TxType,
      label: "Task Payment",
      sublabel: t.title,
      amount: -Number(t.budget),
      date: t.updated_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. Summary stats
  const totalEarned = (earnedTasks ?? []).reduce((s, t) => s + Number(t.budget), 0);
  const totalSpent = (spentTasks ?? []).reduce((s, t) => s + Number(t.budget), 0);
  const completedGigs = (earnedTasks ?? []).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Wallet className="size-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
            <p className="text-sm text-muted-foreground">Earnings, spending, and fund management</p>
          </div>
        </div>
      </FadeIn>

      {/* Balance cards */}
      <FadeIn delay={0.05}>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Available balance — hero card */}
          <div className="sm:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/80 to-accent/80 p-6 text-primary-foreground shadow-lift">
            <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 size-24 rounded-full bg-white/5" />
            <p className="relative text-xs font-semibold uppercase tracking-wider opacity-80">
              Available Balance
            </p>
            <p className="relative mt-2 text-4xl font-extrabold tracking-tight">
              {formatINR(balance)}
            </p>
            <div className="relative mt-4 flex items-center gap-1.5 text-xs opacity-80">
              <BadgeCheck className="size-3.5" />
              Simulated wallet · Safe for demo
            </div>
          </div>

          {/* Locked in escrow */}
          <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Lock className="size-4 text-warning" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                In Escrow
              </p>
            </div>
            <p className="text-2xl font-bold text-warning">{formatINR(lockedBalance)}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Held for active task agreements. Released on completion.
            </p>
          </div>

          {/* Stats */}
          <div className="rounded-2xl border bg-card p-5 shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="size-4 text-success" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifetime Stats
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Earned</span>
                <span className="font-semibold text-success">{formatINR(totalEarned)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Spent</span>
                <span className="font-semibold text-destructive">{formatINR(totalSpent)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Gigs Completed</span>
                <span className="font-semibold">{completedGigs}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">Net Balance</span>
                <span className={`font-bold ${totalEarned - totalSpent >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatINR(totalEarned - totalSpent)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── Top-Up Simulator ───────────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Coins className="size-4 text-accent" />
              </div>
              <h2 className="font-bold text-base">Add Funds</h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">Simulated</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add funds to your wallet to post tasks and pay workers. This is a campus
              simulation — no real money is involved.
            </p>
            <TopUpSimulator currentBalance={balance} />
          </div>
        </FadeIn>

        {/* ── Withdraw Simulator ─────────────────────────────────────────── */}
        <FadeIn delay={0.11}>
          <div className="rounded-2xl border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <ArrowDown className="size-4 text-destructive" />
              </div>
              <h2 className="font-bold text-base">Withdraw Funds</h2>
              <Badge variant="secondary" className="text-[10px] ml-auto">Simulated</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Withdraw your earnings to your UPI ID or bank account. Campus demo only.
            </p>
            <WithdrawSimulator currentBalance={balance} />
          </div>
        </FadeIn>
      </div>

      {/* ── Transaction History ──────────────────────────────────────────── */}
      <FadeIn delay={0.12}>
        <div className="rounded-2xl border bg-card shadow-soft space-y-0 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-base">Transaction History</h2>
            <span className="text-xs text-muted-foreground">{transactions.length} entries</span>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground space-y-2">
              <Wallet className="size-8 mx-auto opacity-30" />
              <p className="text-sm">No transactions yet.</p>
              <p className="text-xs">Complete a gig or post a task to see activity here.</p>
            </div>
          ) : (
            <div className="divide-y max-h-[420px] overflow-y-auto">
              {transactions.map((tx) => {
                const meta = TX_META[tx.type];
                const Icon = meta.icon;
                const isCredit = tx.amount > 0;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
                      <Icon className={`size-4 ${meta.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{tx.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{tx.sublabel}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(tx.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className={`shrink-0 text-right font-bold text-sm ${isCredit ? "text-success" : "text-destructive"}`}>
                      {isCredit ? "+" : ""}{formatINR(Math.abs(tx.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
