export type PaymentProviderName = "simulated" | "razorpay";

export type EscrowStatus = "pending" | "held" | "released" | "refunded" | "partial";

export type PaymentStatus = "created" | "captured" | "failed" | "refunded";

export type TransactionType =
  | "deposit"
  | "hold"
  | "release"
  | "refund"
  | "withdrawal"
  | "commission";

export type TransactionDirection = "credit" | "debit";

export type PaymentResult =
  | { ok: true; transactionId?: string; paymentId?: string; idempotent?: boolean }
  | { ok: false; error: string };

export interface HoldEscrowParams {
  taskId: string;
  applicationId: string;
  payerId: string;
  amountPaise: number;
  idempotencyKey: string;
}

export interface ReleaseEscrowParams {
  paymentId: string;
  workerId: string;
  idempotencyKey: string;
}

export interface RefundEscrowParams {
  paymentId: string;
  idempotencyKey: string;
}

export interface SplitEscrowParams {
  paymentId: string;
  posterId: string;
  workerId: string;
  posterSharePaise: number;
  workerSharePaise: number;
  idempotencyKey: string;
}

export interface DepositParams {
  userId: string;
  amountPaise: number;
  idempotencyKey: string;
  ref?: string;
}

export interface WithdrawParams {
  userId: string;
  amountPaise: number;
  idempotencyKey: string;
  destinationRef?: string;
}

export interface RpcResult {
  ok?: boolean;
  error?: string;
  payment_id?: string;
  transaction_id?: string;
  idempotent?: boolean;
  worker_payout?: number;
  commission?: number;
}
