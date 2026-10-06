import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { createBrief } from "../src/analyze.js";
import { parsePromotion } from "../src/input.js";
import { loadRules } from "../src/rules.js";

const rules = await loadRules(fileURLToPath(new URL("../rules/default.yml", import.meta.url)));

test("returns go for a tested promotion with passing tests", () => {
  const promotion = parsePromotion({
    promotionId: "P-1",
    components: [
      { type: "ApexClass", name: "Service" },
      { type: "ApexClass", name: "ServiceTest" },
    ],
    tests: { status: "passed", passed: 12, failed: 0, total: 12 },
  });

  const brief = createBrief(promotion, rules);
  assert.equal(brief.verdict, "go");
  assert.equal(brief.flags.length, 0);
});

test("holds with component evidence for destructive and untested Apex changes", () => {
  const promotion = parsePromotion({
    promotionId: "P-2",
    components: [
      { type: "CustomObject", name: "Legacy_Record__c", action: "deleted" },
      { type: "ApexClass", name: "BillingService", action: "modified" },
    ],
    tests: { status: "passed", failed: 0 },
  });

  const brief = createBrief(promotion, rules);
  assert.equal(brief.verdict, "hold");
  assert.deepEqual(
    brief.flags.map((flag) => flag.ruleId),
    ["destructive-change", "apex-without-test"],
  );
  assert.ok(brief.flags.every((flag) => flag.evidence.length > 0 && flag.whyItMatters.length > 0));
});

test("reviews when test results are unavailable", () => {
  const promotion = parsePromotion({ promotionId: "P-3", components: [] });
  const brief = createBrief(promotion, rules);

  assert.equal(brief.verdict, "review");
  assert.equal(brief.flags[0]?.ruleId, "test-results-missing");
});

test("does not accept incomplete test counts as a passing run", () => {
  const promotion = parsePromotion({
    promotionId: "P-5",
    components: [],
    tests: { passed: 0, failed: 0 },
  });
  const brief = createBrief(promotion, rules);

  assert.equal(brief.verdict, "review");
  assert.equal(brief.flags[0]?.ruleId, "test-results-missing");
});

test("rejects malformed promotion component input", () => {
  assert.throws(
    () => parsePromotion({ promotionId: "P-4", components: [{ type: "Flow" }] }),
    /non-empty "name"/,
  );
});

test("loads the committed sample snapshot", async () => {
  const raw: unknown = JSON.parse(
    await readFile(new URL("../sample/promotion.json", import.meta.url), "utf8"),
  );
  assert.equal(parsePromotion(raw).promotionId, "PROMO-1042");
});
