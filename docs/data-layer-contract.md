# Cafe POS data-layer contract (v1)

**Status:** Application contract for the browser-based GA4/GTM interview. GTM configuration is a separate follow-on step.

**Boundary:** The application emits business events to `window.dataLayer`. Google Tag Manager is responsible for mapping those events and parameters to GA4. Application code does **not** send GA4 hits or declare conversions directly.

## Invariants

1. All product identifiers use the immutable SKU (`item_id`) across the funnel. Product names are display labels, not identifiers.
2. `price` and `value` are numbers in USD **major units** (e.g., `5.50`, not `550`).
3. `value_cents` is an additional diagnostic/internal field containing the integer cents total (e.g., `1475`). It is **not** the GA4 `value` parameter.
4. Every ecommerce event is preceded by `window.dataLayer.push({ ecommerce: null })` to avoid GTM data-layer v2's merged stale ecommerce objects.
5. The canonical ecommerce `items` array uses GA4 ecommerce field names. There is no legacy `ecommerce.products` array.
6. `transaction_id` exists **only** on `order_completed`, once a sandbox order has succeeded. It must be unique for every successful order.
7. Failed checkout attempts never emit `order_completed`. The application never emits an event named `purchase`; that GA4 event name is owned by GTM.
8. `order_submitted` and `order_failed` are business lifecycle events, not completed purchases.
9. A browser's completed-order history lives in `sessionStorage` and is not a shared source of truth for historical GA4 reporting.

## Ecommerce object

The following fields appear on applicable ecommerce events:

| Field | Type | Meaning |
| --- | --- | --- |
| `ecommerce.currency` | string | Always `USD` |
| `ecommerce.value` | number | Item-total amount in dollars (major units) |
| `ecommerce.value_cents` | integer | The same amount in cents, for diagnostics |
| `ecommerce.items` | array | GA4 item objects |
| `ecommerce.transaction_id` | string | Unique successful order ID; `order_completed` only |

Each item has:

| Field | Type | Meaning |
| --- | --- | --- |
| `item_id` | string | Product SKU; stable throughout the funnel |
| `item_name` | string | Product name |
| `item_category` | string | `Coffee`, `Tea`, `Bakery`, or `Merchandise` |
| `price` | number | Unit price in USD major units |
| `quantity` | positive integer | Number of units |

`ecommerce.value` is the sum of `price * quantity` for all items. No tax or shipping is modeled.

## Event catalog

| `event` | When emitted | Data-layer details | Expected GA4 handling |
| --- | --- | --- | --- |
| `virtual_page_view` | Initial page load and each in-app navigation | `page_name`, `page_title`, `page_path` | Optional virtual `page_view`, configured in GTM; avoid duplicate default page views |
| `view_item_list` | Viewing New Order menu or Products | `ecommerce.items`, `item_list_id`, `item_list_name` | GA4 `view_item_list` |
| `view_item` | Opening product details | Full ecommerce snapshot for one product | GA4 `view_item` |
| `add_to_cart` | Adding one unit to cart | Full ecommerce snapshot for the **added unit** | GA4 `add_to_cart` |
| `remove_from_cart` | Removing one unit from cart | Full ecommerce snapshot for the **removed unit** | GA4 `remove_from_cart` |
| `begin_checkout` | Entering checkout with a non-empty cart | Full current-cart snapshot | GA4 `begin_checkout` |
| `order_submitted` | Placing a test order, before payment outcome is known | Snapshot and `checkout.attempt_id` | Business attempt only, never a confirmed purchase |
| `order_completed` | Approved payment outcome | Snapshot, `checkout.attempt_id`, `ecommerce.transaction_id` | GTM should map to GA4 `purchase` |
| `order_failed` | Declined payment outcome | Snapshot, `checkout.attempt_id`, `checkout.failure_reason` | Do not send as a GA4 purchase |

`begin_checkout` is emitted each time the user enters checkout. Re-entering checkout legitimately represents another checkout entry; it does not mean a purchase occurred.

### Example: approved order

Two Lattes and one Croissant total **$14.75**:

```js
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
  event: "order_submitted",
  checkout: { attempt_id: "ATTEMPT-example" },
  ecommerce: {
    currency: "USD",
    value: 14.75,
    value_cents: 1475,
    items: [
      { item_id: "latte", item_name: "Latte", item_category: "Coffee", price: 5.5, quantity: 2 },
      { item_id: "croissant", item_name: "Croissant", item_category: "Bakery", price: 3.75, quantity: 1 },
    ],
  },
});

// After the asynchronous sandbox payment has succeeded:
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
  event: "order_completed",
  checkout: { attempt_id: "ATTEMPT-example" },
  ecommerce: {
    currency: "USD",
    value: 14.75,
    value_cents: 1475,
    transaction_id: "TEST-example-unique-id",
    items: [
      { item_id: "latte", item_name: "Latte", item_category: "Coffee", price: 5.5, quantity: 2 },
      { item_id: "croissant", item_name: "Croissant", item_category: "Bakery", price: 3.75, quantity: 1 },
    ],
  },
});
```

### Example: declined order

The `order_submitted` event still occurs, followed by:

```js
window.dataLayer.push({ ecommerce: null });
window.dataLayer.push({
  event: "order_failed",
  checkout: {
    attempt_id: "ATTEMPT-example",
    failure_reason: "payment_declined",
  },
  ecommerce: {
    currency: "USD",
    value: 14.75,
    value_cents: 1475,
    items: [
      { item_id: "latte", item_name: "Latte", item_category: "Coffee", price: 5.5, quantity: 2 },
      { item_id: "croissant", item_name: "Croissant", item_category: "Bakery", price: 3.75, quantity: 1 },
    ],
  },
});
```

There must be no `order_completed` and no confirmed transaction ID for this attempt.

## How to validate the contract

1. Run `npm run check`; the automated tests cover monetary units, clearing ecommerce, event timing, transaction IDs and failure outcomes.
2. Open the app, add 2 Lattes and 1 Croissant, then continue to checkout.
3. Open browser DevTools and inspect `window.dataLayer` or connect Tag Assistant.
4. Choose **Test payment - declined**, place the order, and confirm `order_submitted`, `order_failed` and no `order_completed`.
5. Choose **Test payment - approved**, place a new order, and confirm `order_submitted`, `order_completed`, a unique `transaction_id`, `value: 14.75`, and `value_cents: 1475`.
6. Confirm the Orders page contains only approved orders.
7. Inspect `view_item_list`, `view_item`, `add_to_cart`, `remove_from_cart`, and `begin_checkout` and confirm consistent SKUs/quantities.

The GTM mapping is a separate deliverable. The currently published GTM container is not expected to report these new lifecycle events correctly until its baseline is redesigned.
