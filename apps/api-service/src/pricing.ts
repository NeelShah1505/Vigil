import type { Field } from "@vigil/types";

export function priceCall(fields: Field[], baseFee = 0.5, perFieldFee = 0.1): number {
  return Number((baseFee + perFieldFee * fields.length).toFixed(2));
}
