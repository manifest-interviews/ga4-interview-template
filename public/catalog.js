/** Fixed sandbox catalogue. Prices are integer cents, never floating-point dollars. */
export const PRODUCTS = Object.freeze([
  { sku: "drip-coffee", name: "Drip Coffee", price_cents: 250, category: "Coffee" },
  { sku: "latte", name: "Latte", price_cents: 550, category: "Coffee" },
  { sku: "cappuccino", name: "Cappuccino", price_cents: 550, category: "Coffee" },
  { sku: "espresso", name: "Espresso", price_cents: 350, category: "Coffee" },
  { sku: "americano", name: "Americano", price_cents: 400, category: "Coffee" },
  { sku: "matcha-latte", name: "Matcha Latte", price_cents: 600, category: "Tea" },
  { sku: "chai-latte", name: "Chai Latte", price_cents: 550, category: "Tea" },
  { sku: "cold-brew", name: "Cold Brew", price_cents: 450, category: "Coffee" },
  { sku: "croissant", name: "Croissant", price_cents: 375, category: "Bakery" },
  { sku: "blueberry-muffin", name: "Blueberry Muffin", price_cents: 400, category: "Bakery" },
  { sku: "banana-bread", name: "Banana Bread", price_cents: 350, category: "Bakery" },
  { sku: "choc-chip-cookie", name: "Chocolate Chip Cookie", price_cents: 300, category: "Bakery" },
  { sku: "cinnamon-roll", name: "Cinnamon Roll", price_cents: 450, category: "Bakery" },
  { sku: "ceramic-mug", name: "Ceramic Mug", price_cents: 1800, category: "Merchandise" },
  { sku: "tote-bag", name: "Tote Bag", price_cents: 2200, category: "Merchandise" },
]);

export const PRODUCT_BY_SKU = new Map(PRODUCTS.map((product) => [product.sku, product]));

export function dollars(cents) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new TypeError("Expected a non-negative integer amount in cents");
  }
  return cents / 100;
}

export function formatMoney(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars(cents));
}
