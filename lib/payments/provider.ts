import type {
  DepositParams,
  HoldEscrowParams,
  PaymentProviderName,
  PaymentResult,
  RefundEscrowParams,
  ReleaseEscrowParams,
  SplitEscrowParams,
  WithdrawParams,
} from "./types";

/** Abstraction for payment/escrow operations — simulated or Razorpay. */
export interface PaymentProvider {
  readonly name: PaymentProviderName;

  deposit(params: DepositParams): Promise<PaymentResult>;
  withdraw(params: WithdrawParams): Promise<PaymentResult>;

  holdEscrow(params: HoldEscrowParams): Promise<PaymentResult>;
  releaseEscrow(params: ReleaseEscrowParams): Promise<PaymentResult>;
  refundEscrow(params: RefundEscrowParams): Promise<PaymentResult>;
  splitEscrow(params: SplitEscrowParams): Promise<PaymentResult>;
}
