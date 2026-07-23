import assert from "node:assert/strict";
import test from "node:test";
import { retryKeyAction } from "../src/utils/idempotency";

test("ambiguous network retries reuse the original idempotency key", () => {
  assert.equal(retryKeyAction("ambiguous_network_result"), "reuse");
});

test("a retry after insufficient credits uses a new idempotency key", () => {
  assert.equal(retryKeyAction("insufficient_credits"), "replace");
});
