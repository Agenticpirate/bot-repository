import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWebhook, growthRate } from "../src/lib/parse.js";

test("parseWebhook accepts a valid payload", () => {
  const snap = parseWebhook(
    JSON.stringify({ mrr: 330000, activeSubs: 10, occurredAt: "2026-07-01T09:00:00Z" })
  );
  assert.deepEqual(snap, { date: "2026-07-01", mrr: 330000, activeSubs: 10 });
});

test("parseWebhook rejects garbage", () => {
  assert.equal(parseWebhook("not json"), null);
  assert.equal(parseWebhook(JSON.stringify({ mrr: "x" })), null);
});

test("growthRate computes relative change", () => {
  const rate = growthRate([
    { date: "2026-06-01", mrr: 100, activeSubs: 3 },
    { date: "2026-07-01", mrr: 150, activeSubs: 4 },
  ]);
  assert.equal(rate, 0.5);
});
