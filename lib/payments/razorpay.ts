import "server-only";

import type { PaymentProvider } from "./provider";
import type {
  DepositParams,
  HoldEscrowParams,
  PaymentResult,
  RefundEscrowParams,
  ReleaseEscrowParams,
  SplitEscrowParams,
  WithdrawParams,
} from "./types";

const NOT_IMPLEMENTED =
  "Razorpay provider is not wired yet. Set PAYMENT_PROVIDER=simulated or implement lib/payments/razorpay.ts.";

/**
 * Razorpay provider stub — drop-in replacement for simulated provider.
 * Wire order creation, checkout, webhooks, and payouts here when keys are available.
 */
export const razorpayPaymentProvider: PaymentProvider = {
  name: "razorpay",

  async deposit(_params: DepositParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },

  async withdraw(_params: WithdrawParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },

  async holdEscrow(_params: HoldEscrowParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },

  async releaseEscrow(_params: ReleaseEscrowParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },

  async refundEscrow(_params: RefundEscrowParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },

  async splitEscrow(_params: SplitEscrowParams): Promise<PaymentResult> {
    return { ok: false, error: NOT_IMPLEMENTED };
  },
};
