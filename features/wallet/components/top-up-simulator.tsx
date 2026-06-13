"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

const TOP_UP_AMOUNTS = [10000, 25000, 50000, 100000]; // paise
const WITHDRAW_AMOUNTS = [10000, 25000, 50000, 100000]; // paise

// ── Add Funds ─────────────────────────────────────────────────────────────────

export function TopUpSimulator({ currentBalance }: { currentBalance: number }) {
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleTopUp(paiseAmount: number) {
    if (paiseAmount <= 0) {
      setMessage({ ok: false, text: "Enter a valid amount." });
      return;
    }
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ ok: false, text: "Not signed in." });
      setLoading(false);
      return;
    }

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const newBalance = (Number(wallet?.balance) || 0) + paiseAmount;

    const { error } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", user.id);

    setLoading(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
    } else {
      setMessage({ ok: true, text: `${formatINR(paiseAmount)} added! Refreshing…` });
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  const customPaise = Math.round(parseFloat(custom || "0") * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOP_UP_AMOUNTS.map((amount) => (
          <button
            key={amount}
            id={`topup-${amount}`}
            onClick={() => handleTopUp(amount)}
            disabled={loading}
            className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-primary/10 hover:border-primary/40 disabled:opacity-50"
          >
            {formatINR(amount)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
          <input
            id="custom-topup"
            type="number"
            min="1"
            step="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Custom amount"
            className="w-full rounded-lg border bg-background pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button
          id="custom-topup-btn"
          onClick={() => handleTopUp(customPaise)}
          disabled={loading || customPaise <= 0}
          size="sm"
          className="shrink-0"
        >
          {loading ? "Adding…" : "Add Funds"}
        </Button>
      </div>

      {message && (
        <p className={`text-xs font-medium ${message.ok ? "text-success" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        💡 This is a simulated wallet for demo purposes. No real money is transferred.
      </p>
    </div>
  );
}

// ── Withdraw Funds ────────────────────────────────────────────────────────────

export function WithdrawSimulator({ currentBalance }: { currentBalance: number }) {
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState("");
  const [upiId, setUpiId] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [pendingAmount, setPendingAmount] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function selectAmount(paise: number) {
    if (paise > currentBalance) {
      setMessage({ ok: false, text: "Insufficient balance." });
      return;
    }
    setMessage(null);
    setPendingAmount(paise);
    setStep("confirm");
  }

  async function confirmWithdraw() {
    if (!upiId.trim()) {
      setMessage({ ok: false, text: "Enter your UPI ID to proceed." });
      return;
    }
    if (pendingAmount > currentBalance) {
      setMessage({ ok: false, text: "Insufficient balance." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ ok: false, text: "Not signed in." });
      setLoading(false);
      return;
    }

    const newBalance = currentBalance - pendingAmount;

    const { error } = await supabase
      .from("wallets")
      .update({ balance: newBalance })
      .eq("user_id", user.id);

    setLoading(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
    } else {
      setStep("done");
      setTimeout(() => window.location.reload(), 2000);
    }
  }

  const customPaise = Math.round(parseFloat(custom || "0") * 100);

  if (step === "done") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-5 text-center space-y-2">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-success text-sm">Withdrawal Initiated!</p>
        <p className="text-xs text-muted-foreground">
          {formatINR(pendingAmount)} will be credited to <strong>{upiId}</strong> within 24 hours (simulated).
        </p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Withdrawing</p>
          <p className="text-2xl font-extrabold text-warning">{formatINR(pendingAmount)}</p>
          <p className="text-xs text-muted-foreground">
            Remaining balance: {formatINR(currentBalance - pendingAmount)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="upi-id" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            UPI ID / Bank Account
          </label>
          <input
            id="upi-id"
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi or account number"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {message && (
          <p className={`text-xs font-medium ${message.ok ? "text-success" : "text-destructive"}`}>
            {message.text}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => { setStep("form"); setPendingAmount(0); setMessage(null); }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            id="confirm-withdraw-btn"
            size="sm"
            className="flex-1"
            onClick={confirmWithdraw}
            disabled={loading || !upiId.trim()}
          >
            {loading ? "Processing…" : "Confirm Withdrawal"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          🔒 Simulated only — no real transfer happens.
        </p>
      </div>
    );
  }

  // Step: form — pick amount
  return (
    <div className="space-y-4">
      {currentBalance === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          <p className="text-sm">No available balance to withdraw.</p>
          <p className="text-xs mt-1">Complete a gig or add funds first.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WITHDRAW_AMOUNTS.map((amount) => (
              <button
                key={amount}
                id={`withdraw-${amount}`}
                onClick={() => selectAmount(amount)}
                disabled={amount > currentBalance}
                className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-destructive/10 hover:border-destructive/40 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {formatINR(amount)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₹</span>
              <input
                id="custom-withdraw"
                type="number"
                min="1"
                step="1"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Custom amount"
                className="w-full rounded-lg border bg-background pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              id="custom-withdraw-btn"
              variant="destructive"
              onClick={() => selectAmount(customPaise)}
              disabled={customPaise <= 0 || customPaise > currentBalance}
              size="sm"
              className="shrink-0"
            >
              Withdraw
            </Button>
          </div>

          {message && (
            <p className={`text-xs font-medium ${message.ok ? "text-success" : "text-destructive"}`}>
              {message.text}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground">
            Available to withdraw: <strong>{formatINR(currentBalance)}</strong> (locked escrow not included)
          </p>
        </>
      )}
    </div>
  );
}
