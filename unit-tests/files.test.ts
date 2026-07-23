import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResultFileName,
  getFileBaseName,
  normalizeBaseURL,
  sanitizeFileName,
} from "../src/utils/files";

test("normalizes API base URLs", () => {
  assert.equal(
    normalizeBaseURL(" https://www.fanyipaiban.com/translate/openapi/v1/// "),
    "https://www.fanyipaiban.com/translate/openapi/v1",
  );
});

test("sanitizes result file names", () => {
  assert.equal(sanitizeFileName("paper:2026?.pdf"), "paper_2026_.pdf");
  assert.equal(getFileBaseName("paper.final.pdf"), "paper.final");
});

test("builds stable output names", () => {
  assert.equal(buildResultFileName("paper.pdf", "cn", "translated"), "paper_cn_translated.pdf");
  assert.equal(buildResultFileName("paper.pdf", "cn", "comparison"), "paper_cn_comparison.pdf");
  assert.equal(buildResultFileName("paper.pdf", "cn", "markdown"), "paper_cn_translated.md");
});
