export type RetryReason = "ambiguous_network_result" | "insufficient_credits";

export function retryKeyAction(reason: RetryReason): "reuse" | "replace" {
  return reason === "insufficient_credits" ? "replace" : "reuse";
}
