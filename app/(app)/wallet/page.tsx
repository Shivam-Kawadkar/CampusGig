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
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { TopUpSimulator, WithdrawSimulator } from "@/features/wallet/components/top-up-simulator";

export const metadata = {
  title: "Wallet | CampusGig",
  description: "Manage your CampusGig wallet, track earnings and spending",
};

// ── Transaction type helper ───────────────────────────────────────────────────

type LedgerTxType =
  | "deposit"
  | "hold"
  | "release"
  | "refund"
  | "withdrawal"
  | "commission";

interface Transaction {
  id: string;
  type: LedgerTxType;
  label: string;
  sublabel: string;
  amount: number; // paise — positive = credit, negative = debit
  date: string;
}

const TX_LABELS: Record<LedgerTxType, string> = {
  deposit: "Funds Added",
  hold: "Escrow Hold",
  release: "Gig Payout",
  refund: "Escrow Refund",
  withdrawal: "Withdrawal",
  commission: "Platform Fee",
};

const TX_META: Record<
  LedgerTxType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  deposit:    { icon: Coins,         color: "text-accent",      bg: "bg-accent/10" },
  hold:       { icon: Lock,          color: "text-warning",     bg: "bg-warning/10" },
  release:    { icon: ArrowDownLeft, color: "text-success",     bg: "bg-success/10" },
  refund:     { icon: ArrowDownLeft, color: "text-primary",     bg: "bg-primary/10" },
  withdrawal: { icon: ArrowUpRight,  color: "text-destructive", bg: "bg-destructive/10" },
  commission: { icon: ArrowUpRight,  color: "text-muted-foreground", bg: "bg-muted" },
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

  // 2. Ledger transactions
  const { data: ledgerRows } = await supabase
    .from("transactions")
    .select("id, type, amount, direction, created_at, task_id, tasks(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const transactions: Transaction[] = (ledgerRows ?? []).map((row) => {
    const txType = row.type as LedgerTxType;
    const taskTitle = (() => {
      const task = row.tasks as unknown;
      if (Array.isArray(task)) return (task as { title: string }[])[0]?.title;
      if (task && typeof task === "object") return (task as { title: string }).title;
      return undefined;
    })();

    const signedAmount =
      row.direction === "credit" ? Number(row.amount) : -Number(row.amount);

    return {
      id: row.id,
      type: txType,
      label: TX_LABELS[txType] ?? row.type,
      sublabel: taskTitle ?? "Wallet activity",
      amount: signedAmount,
      date: row.created_at,
    };
  });

  // 3. Summary stats from ledger
  const totalEarned = (ledgerRows ?? [])
    .filter((r) => r.type === "release" && r.direction === "credit")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalSpent = (ledgerRows ?? [])
    .filter((r) =>
      (r.type === "hold" && r.direction === "debit") ||
      (r.type === "withdrawal" && r.direction === "debit")
    )
    .reduce((s, r) => s + Number(r.amount), 0);
  const completedGigs = (ledgerRows ?? []).filter(
    (r) => r.type === "release" && r.direction === "credit"
  ).length;

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
            <AnimatedCounter
              value={balance}
              formatType="inr"
              className="relative mt-2 block text-4xl font-extrabold tracking-tight"
            />
            <div className="relative mt-4 flex items-center gap-1.5 text-xs opacity-80">
              <BadgeCheck className="size-3.5" />
              Escrow-protected · Simulated for demo
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
            <AnimatedCounter
              value={lockedBalance}
              formatType="inr"
              className="block text-2xl font-bold text-warning"
            />
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
