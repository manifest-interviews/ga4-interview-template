import { dollars } from "./catalog.js";

/**
 * Public browser-to-GTM contract.
 * This module NEVER sends events directly to GA4. GTM owns that mapping.
 * See docs/data-layer-contract.md before changing event names or fields.
 */
export const CURRENCY = "USD";

function layer() {
  if (!globalThis.window) throw new Error("The data layer requires a browser window");
  return (window.dataLayer ??= []);
}

export function toAnalyticsItems(lines) {
  return lines.map(({ product, quantity }) => {
    if (!product?.sku || !Number.isInteger(product.price_cents) ||
        product.price_cents < 0 || !Number.isInteger(quantity) || quantity <= 0) {
      throw new TypeError("Invalid cart line for analytics");
    }
    return {
      item_id: product.sku,
      item_name: product.name,
      item_category: product.category,
      price: dollars(product.price_cents),
      quantity,
    };
  });
}

export function ecommerceSnapshot(lines) {
  const valueCents = lines.reduce((sum, { product, quantity }) => {
    if (!Number.isInteger(product?.price_cents) || product.price_cents < 0 ||
        !Number.isInteger(quantity) || quantity <= 0) {
      throw new TypeError("Invalid cart line for ecommerce value");
    }
    return sum + product.price_cents * quantity;
  }, 0);
  return {
    currency: CURRENCY,
    value: dollars(valueCents),
    value_cents: valueCents,
    items: toAnalyticsItems(lines),
  };
}

function emit(event, payload) {
  layer().push({ event, ...payload });
}

/** GTM data layer v2 retains ecommerce across pushes; clear stale values first. */
function emitEcommerce(event, ecommerce, metadata = {}) {
  const dataLayer = layer();
  dataLayer.push({ ecommerce: null });
  dataLayer.push({ event, ...metadata, ecommerce });
}

export function emitVirtualPageView(pageName, pageTitle, pagePath) {
  emit("virtual_page_view", {
    page_name: pageName,
    page_title: pageTitle,
    page_path: pagePath,
  });
}

export function emitViewItemList(products, listId, listName) {
  const items = toAnalyticsItems(products.map((product) => ({ product, quantity: 1 })));
  emitEcommerce("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items,
  });
}

export function emitViewItem(product) {
  emitEcommerce("view_item", ecommerceSnapshot([{ product, quantity: 1 }]));
}

export function emitAddToCart(product, quantity = 1) {
  emitEcommerce("add_to_cart", ecommerceSnapshot([{ product, quantity }]));
}

export function emitRemoveFromCart(product, quantity = 1) {
  emitEcommerce("remove_from_cart", ecommerceSnapshot([{ product, quantity }]));
}

export function emitBeginCheckout(lines) {
  emitEcommerce("begin_checkout", ecommerceSnapshot(lines));
}

/** No transaction_id exists until the test order is confirmed. */
export function emitOrderSubmitted(lines, attemptId) {
  emitEcommerce("order_submitted", ecommerceSnapshot(lines), {
    checkout: { attempt_id: attemptId },
  });
}

/** A confirmed business event, intentionally not named `purchase` (GTM maps it). */
export function emitOrderCompleted(lines, attemptId, transactionId) {
  emitEcommerce("order_completed", {
    ...ecommerceSnapshot(lines),
    transaction_id: transactionId,
  }, { checkout: { attempt_id: attemptId } });
}

export function emitOrderFailed(lines, attemptId, reason) {
  emitEcommerce("order_failed", ecommerceSnapshot(lines), {
    checkout: { attempt_id: attemptId, failure_reason: reason },
  });
}
