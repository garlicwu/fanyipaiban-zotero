import assert from "node:assert/strict";
import test from "node:test";
import { ApiClientError, parseEnvelopeText, resolveRuntimeGlobal } from "../src/services/apiClient";

test("resolveRuntimeGlobal obtains missing web APIs from the Zotero window provider", () => {
  class RuntimeFormData {}
  const resolved = resolveRuntimeGlobal<typeof RuntimeFormData>("FormData", {
    getGlobal(name) {
      return name === "FormData" ? RuntimeFormData : undefined;
    },
  });

  assert.equal(resolved, RuntimeFormData);
});

test("parseEnvelopeText returns successful data", () => {
  const result = parseEnvelopeText<{ id: string }>(
    JSON.stringify({ success: true, data: { id: "task-1" } }),
    202,
  );
  assert.deepEqual(result, { id: "task-1" });
});

test("parseEnvelopeText exposes insufficient credit details", () => {
  assert.throws(
    () =>
      parseEnvelopeText(
        JSON.stringify({
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: "Not enough credits",
            required_token: 150000,
            available_token: 50000,
            shortage_token: 100000,
          },
        }),
        402,
      ),
    (error) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.code, "INSUFFICIENT_CREDITS");
      assert.equal(error.requiredCredits, 150000);
      assert.equal(error.availableCredits, 50000);
      assert.equal(error.shortageCredits, 100000);
      return true;
    },
  );
});

test("parseEnvelopeText rejects invalid JSON", () => {
  assert.throws(
    () => parseEnvelopeText("<html>bad gateway</html>", 502),
    (error) => error instanceof ApiClientError && error.code === "INVALID_RESPONSE",
  );
});
