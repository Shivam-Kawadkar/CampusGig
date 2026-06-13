/** Platform commission in basis points (500 = 5%). Must match migration 0009. */
export const PLATFORM_COMMISSION_BPS = 500;

export function calcCommission(amountPaise: number): number {
  return Math.floor((amountPaise * PLATFORM_COMMISSION_BPS) / 10000);
}
