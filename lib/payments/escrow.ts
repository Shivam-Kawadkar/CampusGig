import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "./index";
import type { PaymentResult } from "./types";

/** Fetch the active held payment for a task, if any. */
export async function getHeldPaymentForTask(taskId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("id, amount, commission, payer_id, escrow_status")
    .eq("task_id", taskId)
    .eq("escrow_status", "held")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function holdEscrowForProposal(
  taskId: string,
  applicationId: string,
  payerId: string,
  amountPaise: number
): Promise<PaymentResult> {
  const provider = getPaymentProvider();
  return provider.holdEscrow({
    taskId,
    applicationId,
    payerId,
    amountPaise,
    idempotencyKey: `hold:${taskId}:${applicationId}`,
  });
}

export async function releaseEscrowForTask(
  taskId: string,
  workerId: string
): Promise<PaymentResult> {
  const payment = await getHeldPaymentForTask(taskId);
  if (!payment) {
    return { ok: false, error: "No held escrow found for this task." };
  }

  const provider = getPaymentProvider();
  return provider.releaseEscrow({
    paymentId: payment.id,
    workerId,
    idempotencyKey: `release:${payment.id}`,
  });
}

export async function refundEscrowForTask(taskId: string): Promise<PaymentResult> {
  const payment = await getHeldPaymentForTask(taskId);
  if (!payment) {
    return { ok: false, error: "No held escrow found for this task." };
  }

  const provider = getPaymentProvider();
  return provider.refundEscrow({
    paymentId: payment.id,
    idempotencyKey: `refund:${payment.id}`,
  });
}

export async function splitEscrowForTask(
  taskId: string,
  posterId: string,
  workerId: string,
  posterSharePaise: number,
  workerSharePaise: number
): Promise<PaymentResult> {
  const payment = await getHeldPaymentForTask(taskId);
  if (!payment) {
    return { ok: false, error: "No held escrow found for this task." };
  }

  const provider = getPaymentProvider();
  return provider.splitEscrow({
    paymentId: payment.id,
    posterId,
    workerId,
    posterSharePaise,
    workerSharePaise,
    idempotencyKey: `split:${payment.id}`,
  });
}
