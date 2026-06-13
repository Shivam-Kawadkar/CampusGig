import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentProvider } from "./provider";
import type {
  DepositParams,
  HoldEscrowParams,
  PaymentResult,
  RefundEscrowParams,
  ReleaseEscrowParams,
  RpcResult,
  SplitEscrowParams,
  WithdrawParams,
} from "./types";

function parseRpc(data: RpcResult | null): PaymentResult {
  if (!data?.ok) {
    return { ok: false, error: data?.error ?? "Payment operation failed" };
  }
  return {
    ok: true,
    paymentId: data.payment_id,
    transactionId: data.transaction_id,
    idempotent: data.idempotent,
  };
}

/** Simulated provider — instant capture via Postgres RPCs (no external gateway). */
export const simulatedPaymentProvider: PaymentProvider = {
  name: "simulated",

  async deposit({ userId, amountPaise, idempotencyKey, ref }: DepositParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("wallet_deposit", {
      p_user_id: userId,
      p_amount: amountPaise,
      p_idempotency_key: idempotencyKey,
      p_ref: ref ?? "simulated",
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },

  async withdraw({ userId, amountPaise, idempotencyKey, destinationRef }: WithdrawParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("wallet_withdraw", {
      p_user_id: userId,
      p_amount: amountPaise,
      p_idempotency_key: idempotencyKey,
      p_ref: destinationRef ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },

  async holdEscrow({
    taskId,
    applicationId,
    payerId,
    amountPaise,
    idempotencyKey,
  }: HoldEscrowParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("escrow_hold", {
      p_task_id: taskId,
      p_application_id: applicationId,
      p_payer_id: payerId,
      p_amount: amountPaise,
      p_idempotency_key: idempotencyKey,
      p_provider: "simulated",
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },

  async releaseEscrow({ paymentId, workerId, idempotencyKey }: ReleaseEscrowParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("escrow_release", {
      p_payment_id: paymentId,
      p_worker_id: workerId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },

  async refundEscrow({ paymentId, idempotencyKey }: RefundEscrowParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("escrow_refund", {
      p_payment_id: paymentId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },

  async splitEscrow({
    paymentId,
    posterId,
    workerId,
    posterSharePaise,
    workerSharePaise,
    idempotencyKey,
  }: SplitEscrowParams) {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("escrow_split", {
      p_payment_id: paymentId,
      p_poster_id: posterId,
      p_worker_id: workerId,
      p_poster_share: posterSharePaise,
      p_worker_share: workerSharePaise,
      p_idempotency_key: idempotencyKey,
    });
    if (error) return { ok: false, error: error.message };
    return parseRpc(data as RpcResult);
  },
};
