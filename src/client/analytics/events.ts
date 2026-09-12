/**
 * GA4 ecommerce funnel events.
 *
 * Every event here maps to a GA4 recommended event, which is what makes the
 * built-in Monetisation and Purchase-journey reports work without custom
 * configuration. The names and field shapes are fixed by Google — they are not
 * ours to choose.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

import type { Product } from "../../shared/contracts/products";
import { pushEcommerce } from "./dataLayer";

export const CURRENCY = "USD";

/** A GA4 ecommerce item. `price` is in major units, never cents. */
export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

/**
 * The app stores money as integer cents; GA4 expects major currency units.
 * This boundary is the only place the two conventions should meet.
 */
export function toCurrency(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * `item_id` must be the SKU everywhere in the funnel. If add_to_cart reports a
 * SKU and purchase reports a database ID, GA4 treats them as different products
 * and the item-level funnel silently falls apart.
 */
export function toItem(product: Product, quantity = 1): AnalyticsItem {
  return {
    item_id: product.sku,
    item_name: product.name,
    price: product.price_cents,
    quantity,
  };
}

function sumValue(items: AnalyticsItem[]): number {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return Math.round(total * 100) / 100;
}

export function viewItemList(
  products: Product[],
  listId: string,
  listName: string,
) {
  pushEcommerce("view_item_list", {
    item_list_id: listId,
    item_list_name: listName,
    items: products.map((p) => toItem(p)),
  });
}

export function viewItem(product: Product) {
  const items = [toItem(product)];
  pushEcommerce("view_item", {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  });
}

export function addToCart(product: Product, quantity = 1) {
  const items = [toItem(product, quantity)];
  pushEcommerce("add_to_cart", {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  });
}

export function removeFromCart(product: Product, quantity = 1) {
  const items = [toItem(product, quantity)];
  pushEcommerce("remove_from_cart", {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  });
}

export function beginCheckout(items: AnalyticsItem[]) {
  pushEcommerce("begin_checkout", {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  });
}

export function purchase(items: AnalyticsItem[]) {
  pushEcommerce("purchase", {
    currency: CURRENCY,
    value: sumValue(items),
    items,
  });
}
