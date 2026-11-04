import test from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_BY_SKU, dollars } from "../public/catalog.js";
import {
  ecommerceSnapshot,
  emitAddToCart,
  emitBeginCheckout,
  emitOrderCompleted,
  emitOrderFailed,
  emitOrderSubmitted,
  emitRemoveFromCart,
  emitViewItem,
  emitViewItemList,
  emitVirtualPageView,
} from "../public/analytics.js";

const latte = PRODUCT_BY_SKU.get("latte");
const croissant = PRODUCT_BY_SKU.get("croissant");
const lines = [{ product: latte, quantity: 2 }, { product: croissant, quantity: 1 }];

function capture(fn) {
  const before = globalThis.window;
  globalThis.window = { dataLayer: [] };
  try { fn(); return globalThis.window.dataLayer; }
  finally { globalThis.window = before; }
}

test("prices are expressed in major units; cents are retained separately", () => {
  assert.equal(dollars(550), 5.5);
  const snap = ecommerceSnapshot(lines);
  assert.equal(snap.value, 14.75);
  assert.equal(snap.value_cents, 1475);
  assert.equal(snap.currency, "USD");
  assert.deepEqual(snap.items.map((item) => [item.item_id, item.price, item.quantity]), [
    ["latte", 5.5, 2], ["croissant", 3.75, 1],
  ]);
});

test("all ecommerce events clear stale values with ecommerce:null", () => {
  const data = capture(() => {
    emitViewItemList([latte], "menu", "Menu");
    emitViewItem(latte);
    emitAddToCart(latte);
    emitRemoveFromCart(latte);
    emitBeginCheckout(lines);
    emitOrderSubmitted(lines, "ATTEMPT-1");
    emitOrderCompleted(lines, "ATTEMPT-1", "TEST-1");
    emitOrderFailed(lines, "ATTEMPT-2", "payment_declined");
  });
  assert.equal(data.length, 16);
  for (let i = 0; i < data.length; i += 2) {
    assert.deepEqual(data[i], { ecommerce: null });
    assert.ok(data[i + 1].event);
    assert.ok(data[i + 1].ecommerce);
  }
});

test("events carry the intended names, transaction timing and identifiers", () => {
  const data = capture(() => {
    emitOrderSubmitted(lines, "ATTEMPT-1");
    emitOrderFailed(lines, "ATTEMPT-1", "payment_declined");
    emitOrderCompleted(lines, "ATTEMPT-2", "TEST-2");
  });
  assert.deepEqual(data.filter((_, index) => index % 2 === 1).map((item) => item.event), [
    "order_submitted", "order_failed", "order_completed",
  ]);
  assert.equal(data[1].ecommerce.transaction_id, undefined);
  assert.equal(data[3].ecommerce.transaction_id, undefined);
  assert.equal(data[5].ecommerce.transaction_id, "TEST-2");
  assert.equal(data[5].checkout.attempt_id, "ATTEMPT-2");
  assert.equal(data[3].checkout.failure_reason, "payment_declined");
  assert.equal(data.some((entry) => entry.event === "purchase"), false);
});

test("virtual page views carry page identity without an ecommerce reset", () => {
  const data = capture(() => emitVirtualPageView("products", "Products", "/products"));
  assert.deepEqual(data, [{ event: "virtual_page_view", page_name: "products", page_title: "Products", page_path: "/products" }]);
});

test("invalid cart lines fail loudly, never sending incorrect revenue", () => {
  assert.throws(() => ecommerceSnapshot([{ product: latte, quantity: 0 }]));
  assert.throws(() => ecommerceSnapshot([{ product: latte, quantity: -1 }]));
});
