import { PRODUCTS, PRODUCT_BY_SKU, formatMoney } from "./catalog.js";
import {
  emitAddToCart,
  emitBeginCheckout,
  emitRemoveFromCart,
  emitViewItem,
  emitViewItemList,
  emitVirtualPageView,
} from "./analytics.js";
import { submitTestOrder, TEST_PAYMENTS } from "./checkout.js";

const STORAGE_KEY = "manifest-cafe-pos-demo-orders-v1";
const root = document.getElementById("app");
const state = {
  page: "new-order",
  selectedSku: null,
  cart: new Map(),
  orders: loadOrders(),
  receipt: null,
  paymentOutcome: TEST_PAYMENTS.APPROVED,
  checkoutError: null,
  notice: null,
  isSubmitting: false,
};

function loadOrders() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveOrders() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.orders));
  } catch {
    // The sandbox remains usable when storage is disabled.
  }
}

function cartLines() {
  return [...state.cart.entries()]
    .map(([sku, quantity]) => ({ product: PRODUCT_BY_SKU.get(sku), quantity }))
    .filter(({ product }) => Boolean(product));
}

function cartTotalCents() {
  return cartLines().reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
}

function cartQuantity() {
  return [...state.cart.values()].reduce((sum, quantity) => sum + quantity, 0);
}

function addProduct(sku) {
  const product = PRODUCT_BY_SKU.get(sku);
  if (!product) return;
  state.cart.set(sku, (state.cart.get(sku) ?? 0) + 1);
  state.notice = null;
  emitAddToCart(product, 1);
  render();
}

function removeProduct(sku) {
  const product = PRODUCT_BY_SKU.get(sku);
  const current = state.cart.get(sku) ?? 0;
  if (!product || current <= 0) return;
  if (current === 1) state.cart.delete(sku);
  else state.cart.set(sku, current - 1);
  emitRemoveFromCart(product, 1);
  render();
}

const PAGE_INFO = {
  "new-order": { page_name: "new_order", page_title: "New Order", page_path: "/new-order" },
  products: { page_name: "products", page_title: "Products", page_path: "/products" },
  product: { page_name: "product_detail", page_title: "Product Detail", page_path: "/products/detail" },
  checkout: { page_name: "checkout", page_title: "Checkout", page_path: "/checkout" },
  orders: { page_name: "orders", page_title: "Orders", page_path: "/orders" },
  receipt: { page_name: "order_confirmation", page_title: "Order Confirmation", page_path: "/order-confirmation" },
};

function navigate(page, sku = null) {
  if (!PAGE_INFO[page]) return;
  state.page = page;
  state.selectedSku = sku;
  state.notice = null;
  const info = PAGE_INFO[page];
  emitVirtualPageView(info.page_name, info.page_title, info.page_path);

  if (page === "new-order") emitViewItemList(PRODUCTS, "menu", "Menu");
  if (page === "products") emitViewItemList(PRODUCTS, "catalog", "Product Catalogue");
  if (page === "product") {
    const product = PRODUCT_BY_SKU.get(sku);
    if (product) emitViewItem(product);
  }
  render();
}

function beginCheckout() {
  const lines = cartLines();
  if (!lines.length) return;
  state.checkoutError = null;
  state.paymentOutcome = TEST_PAYMENTS.APPROVED;
  emitBeginCheckout(lines);
  navigate("checkout");
}

async function placeOrder() {
  const lines = cartLines();
  if (!lines.length || state.isSubmitting) return;
  state.isSubmitting = true;
  state.checkoutError = null;
  render();
  try {
    const result = await submitTestOrder(lines, state.paymentOutcome);
    if (!result.ok) {
      state.checkoutError = "This sandbox payment was declined. No order was created.";
      return;
    }
    state.orders.unshift(result.order);
    saveOrders();
    state.receipt = result.order;
    state.cart.clear();
    navigate("receipt");
  } catch (error) {
    console.error("Sandbox checkout failed", error);
    state.checkoutError = "The sandbox could not complete the order. Please try again.";
  } finally {
    state.isSubmitting = false;
    render();
  }
}

function productRows(products, includeDetails = false) {
  return products.map((product) => {
    const quantity = state.cart.get(product.sku) ?? 0;
    return `<li class="product-row">
      <div class="product-avatar" aria-hidden="true">${product.category === "Bakery" ? "B" : product.category === "Merchandise" ? "M" : "C"}</div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="muted small">${product.category} &middot; ${product.sku}</div>
        ${includeDetails ? `<button class="inline-action" data-action="details" data-sku="${product.sku}">View details</button>` : ""}
      </div>
      <div class="product-price">${formatMoney(product.price_cents)}</div>
      <div class="quantity-controls">
        ${quantity ? `<button class="small-button" data-action="remove" data-sku="${product.sku}" aria-label="Remove one ${product.name}">-</button><span aria-label="Quantity ${quantity}">${quantity}</span>` : ""}
        <button class="small-button primary" data-action="add" data-sku="${product.sku}" aria-label="Add one ${product.name}">+</button>
      </div>
    </li>`;
  }).join("");
}

function renderNewOrder() {
  return `<div class="page-heading">
    <div><div class="eyebrow">CAFE POINT OF SALE</div><h1>New Order</h1><p class="muted">Choose products and complete a sandbox checkout.</p></div>
    <span class="pill">Demo environment</span>
  </div>
  <section class="card"><div class="section-heading"><h2>Menu</h2><span class="muted small">${PRODUCTS.length} items</span></div>
    <ul class="product-list">${productRows(PRODUCTS)}</ul></section>`;
}

function renderProducts() {
  return `<div class="page-heading"><div><div class="eyebrow">CATALOGUE</div><h1>Products</h1><p class="muted">Inspect product details or add them to your order.</p></div></div>
  <section class="card"><div class="section-heading"><h2>Products</h2><span class="muted small">${PRODUCTS.length} available</span></div>
    <ul class="product-list">${productRows(PRODUCTS, true)}</ul></section>`;
}

function renderProduct() {
  const product = PRODUCT_BY_SKU.get(state.selectedSku);
  if (!product) return `<section class="card"><p>Product not found.</p></section>`;
  return `<div class="page-heading"><div><div class="eyebrow">PRODUCT DETAILS</div><h1>${product.name}</h1><p class="muted">SKU: ${product.sku}</p></div></div>
    <section class="card product-detail"><div class="detail-avatar" aria-hidden="true">${product.category[0]}</div>
    <div><span class="pill">${product.category}</span><h2>${product.name}</h2>
      <p class="detail-price">${formatMoney(product.price_cents)}</p>
      <div class="actions"><button class="button primary" data-action="add" data-sku="${product.sku}">Add to order</button>
      <button class="button secondary" data-action="navigate" data-page="products">Back to products</button></div></div></section>`;
}

function renderCart() {
  const lines = cartLines();
  return `<aside class="cart-panel" aria-label="Cart">
    <div class="section-heading"><h2>Your cart</h2><span class="count">${cartQuantity()}</span></div>
    ${!lines.length ? `<div class="empty"><p>Your cart is empty.</p><p class="small muted">Add a product to get started.</p></div>` : `
      <ul class="cart-list">${lines.map(({ product, quantity }) => `<li class="cart-row">
        <div><div class="product-name">${product.name} <span class="muted">x${quantity}</span></div><div class="small muted">${formatMoney(product.price_cents)} each</div></div>
        <strong>${formatMoney(product.price_cents * quantity)}</strong></li>`).join("")}</ul>
      <div class="cart-total"><span>Total</span><strong>${formatMoney(cartTotalCents())}</strong></div>
      ${state.page === "checkout" ? `<p class="small muted">Checkout is in progress.</p>` : `<button class="button primary full" data-action="checkout">Continue to checkout</button>`}
    `}
    <div class="cart-note">Sandbox only: no real payment or customer information is collected.</div>
  </aside>`;
}

function renderCheckout() {
  return `<div class="page-heading"><div><div class="eyebrow">CHECKOUT</div><h1>Review your order</h1>
    <p class="muted">Use a test payment to complete or decline this order.</p></div></div>
    <section class="card checkout-card"><h2>Test payment</h2>
      <p class="muted small">No card number or payment credentials are required.</p>
      <label class="form-label" for="payment-option">Payment option</label>
      <select id="payment-option" class="select">
        <option value="approved" ${state.paymentOutcome === TEST_PAYMENTS.APPROVED ? "selected" : ""}>Test payment - approved</option>
        <option value="declined" ${state.paymentOutcome === TEST_PAYMENTS.DECLINED ? "selected" : ""}>Test payment - declined</option>
      </select>
      ${state.checkoutError ? `<div class="alert error" role="alert">${state.checkoutError}</div>` : ""}
      <div class="checkout-total"><span>Order total</span><strong>${formatMoney(cartTotalCents())}</strong></div>
      <div class="actions"><button class="button primary" data-action="place-order" ${state.isSubmitting ? "disabled" : ""}>${state.isSubmitting ? "Processing..." : "Place test order"}</button>
        <button class="button secondary" data-action="navigate" data-page="new-order">Back to menu</button></div>
    </section>`;
}

function renderOrders() {
  const rows = state.orders.map((order) => `<li class="order-row"><div>
    <div class="product-name">${order.transaction_id}</div>
    <div class="muted small">${new Date(order.created_at).toLocaleString()} &middot; ${order.items.length} product types</div></div>
    <strong>${formatMoney(order.total_cents)}</strong></li>`).join("");
  return `<div class="page-heading"><div><div class="eyebrow">LOCAL SESSION</div><h1>Orders</h1>
    <p class="muted">Only successful orders from this browser tab are shown.</p></div></div>
    <section class="card"><div class="section-heading"><h2>Completed orders</h2><span class="count">${state.orders.length}</span></div>
      ${rows ? `<ul class="order-list">${rows}</ul>` : `<div class="empty"><p>No completed orders yet.</p>
      <button class="button secondary" data-action="navigate" data-page="new-order">Create an order</button></div>`}</section>`;
}

function renderReceipt() {
  const order = state.receipt;
  if (!order) return renderOrders();
  return `<div class="page-heading"><div><div class="eyebrow success-text">ORDER CONFIRMED</div>
    <h1>Order complete</h1><p class="muted">Your sandbox purchase was successful.</p></div></div>
    <section class="card receipt"><div class="success-icon" aria-hidden="true">&#10003;</div>
    <h2>Thank you!</h2><p class="muted small">Transaction ID</p><code class="transaction-id">${order.transaction_id}</code>
    <ul class="cart-list">${order.items.map((item) => `<li class="cart-row"><span>${item.name} x${item.quantity}</span>
      <strong>${formatMoney(item.price_cents * item.quantity)}</strong></li>`).join("")}</ul>
    <div class="cart-total"><span>Total</span><strong>${formatMoney(order.total_cents)}</strong></div>
    <button class="button primary" data-action="navigate" data-page="new-order">Start another order</button></section>`;
}

function pageContent() {
  if (state.page === "products") return renderProducts();
  if (state.page === "product") return renderProduct();
  if (state.page === "checkout") return renderCheckout();
  if (state.page === "orders") return renderOrders();
  if (state.page === "receipt") return renderReceipt();
  return renderNewOrder();
}

function render() {
  const active = state.page === "new-order" || state.page === "checkout" || state.page === "receipt" ? "new-order" : state.page === "product" ? "products" : state.page;
  root.innerHTML = `<div class="app-shell">
    <nav class="sidebar" aria-label="Main navigation">
      <div class="brand"><span class="brand-logo">M</span><div><strong>Manifest</strong><span>CAFE POS</span></div></div>
      <div class="nav-links">
        <button class="nav-link ${active === "new-order" ? "active" : ""}" data-action="navigate" data-page="new-order">New Order</button>
        <button class="nav-link ${active === "products" ? "active" : ""}" data-action="navigate" data-page="products">Products</button>
        <button class="nav-link ${active === "orders" ? "active" : ""}" data-action="navigate" data-page="orders">Orders</button>
      </div>
      <div class="sidebar-footer"><div class="sidebar-label">Analytics test environment</div>
        <button class="reset-button" data-action="reset">Reset demo session</button></div>
    </nav>
    <div class="workspace"><main class="main-content">${pageContent()}</main>
      ${["new-order", "products", "product", "checkout"].includes(state.page) ? renderCart() : ""}</div>
  </div>`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !root.contains(button)) return;
  const action = button.dataset.action;
  const sku = button.dataset.sku;
  if (action === "add") addProduct(sku);
  if (action === "remove") removeProduct(sku);
  if (action === "details") navigate("product", sku);
  if (action === "navigate" && !state.isSubmitting) navigate(button.dataset.page);
  if (action === "checkout" && !state.isSubmitting) beginCheckout();
  if (action === "place-order") placeOrder();
  if (action === "reset" && !state.isSubmitting) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* no storage */ }
    window.location.reload();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.id === "payment-option") {
    state.paymentOutcome = event.target.value;
    state.checkoutError = null;
  }
});

navigate("new-order");
