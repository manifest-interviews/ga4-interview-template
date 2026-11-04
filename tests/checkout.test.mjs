import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_BY_SKU } from "../public/catalog.js";
import { submitTestOrder, TEST_PAYMENTS } from "../public/checkout.js";

const lines = [
  { product: PRODUCT_BY_SKU.get("latte"), quantity: 2 },
  { product: PRODUCT_BY_SKU.get("croissant"), quantity: 1 },
];

async function run(payment, ids) {
  const before = globalThis.window;
  globalThis.window = { dataLayer: [] };
  try {
    const result = await submitTestOrder(lines, payment, {
      idFactory: (prefix) => `${prefix}-${ids.shift()}`,
      now: () => "2026-11-03T00:00:00.000Z",
      delayMs: 0,
    });
    return { result, events: globalThis.window.dataLayer.filter((item) => item.event) };
  } finally { globalThis.window = before; }
}

test("approved payment yields exactly one completed order with consistent amounts", async () => {
  const { result, events } = await run(TEST_PAYMENTS.APPROVED, ["A", "B"]);
  assert.equal(result.ok, true);
  assert.equal(result.order.transaction_id, "TEST-B");
  assert.equal(result.order.total_cents, 1475);
  assert.equal(result.order.items.length, 2);
  assert.deepEqual(events.map((event) => event.event), ["order_submitted", "order_completed"]);
  assert.equal(events[1].ecommerce.value, 14.75);
  assert.equal(events[1].ecommerce.transaction_id, result.order.transaction_id);
});

test("declined payment emits failure but never a completed transaction", async () => {
  const { result, events } = await run(TEST_PAYMENTS.DECLINED, ["A"]);
  assert.equal(result.ok, false);
  assert.equal(result.order, undefined);
  assert.deepEqual(events.map((event) => event.event), ["order_submitted", "order_failed"]);
  assert.equal(events.some((event) => event.ecommerce.transaction_id), false);
});

test("empty orders and unexpected payment options are rejected", async () => {
  await assert.rejects(submitTestOrder([], TEST_PAYMENTS.APPROVED));
  await assert.rejects(submitTestOrder(lines, "anything-else"));
});

test("order submission is observable before asynchronous completion", async () => {
  const before = globalThis.window;
  globalThis.window = { dataLayer: [] };
  try {
    const pending = submitTestOrder(lines, TEST_PAYMENTS.APPROVED, {
      idFactory: (prefix) => `${prefix}-delay-check`,
      delayMs: 20,
    });
    assert.deepEqual(globalThis.window.dataLayer.filter((event) => event.event).map((event) => event.event), ["order_submitted"]);
    await pending;
    assert.deepEqual(globalThis.window.dataLayer.filter((event) => event.event).map((event) => event.event), [
      "order_submitted", "order_completed",
    ]);
  } finally { globalThis.window = before; }
});
