"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";

export type WalletActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Simulated wallet top-up — credits balance via the payment engine. */
export async function depositFunds(amountPaise: number): Promise<WalletActionResult> {
  if (amountPaise <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  try {
    const provider = getPaymentProvider();
    const result = await provider.deposit({
      userId: user.id,
      amountPaise,
      idempotencyKey: `deposit:${user.id}:${amountPaise}:${Date.now()}`,
      ref: "simulated",
    });

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not add funds.";
    return { ok: false, error: message };
  }
}

/** Simulated withdrawal — debits available balance (not locked escrow). */
export async function withdrawFunds(
  amountPaise: number,
  destinationRef: string
): Promise<WalletActionResult> {
  if (amountPaise <= 0) {
    return { ok: false, error: "Enter a valid amount." };
  }
  if (!destinationRef.trim()) {
    return { ok: false, error: "Enter your UPI ID or bank account." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  try {
    const provider = getPaymentProvider();
    const result = await provider.withdraw({
      userId: user.id,
      amountPaise,
      idempotencyKey: `withdraw:${user.id}:${amountPaise}:${Date.now()}`,
      destinationRef: destinationRef.trim(),
    });

    if (!result.ok) return { ok: false, error: result.error };

    revalidatePath("/wallet");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not withdraw funds.";
    return { ok: false, error: message };
  }
}
