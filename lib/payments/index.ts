import "server-only";

import type { PaymentProvider } from "./provider";
import { razorpayPaymentProvider } from "./razorpay";
import { simulatedPaymentProvider } from "./simulated";

export type { PaymentProvider } from "./provider";
export * from "./types";
export * from "./constants";
export { simulatedPaymentProvider, razorpayPaymentProvider };

/** Resolve active payment provider from env (default: simulated). */
export function getPaymentProvider(): PaymentProvider {
  const mode = process.env.PAYMENT_PROVIDER ?? "simulated";
  if (
    mode === "razorpay" &&
    process.env.RAZORPAY_KEY_SECRET &&
    process.env.RAZORPAY_KEY_ID
  ) {
    return razorpayPaymentProvider;
  }
  return simulatedPaymentProvider;
}
