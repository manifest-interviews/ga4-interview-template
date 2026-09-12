import { tsr } from "@ts-rest/serverless/fetch";
import { ordersContract } from "../../shared/contracts/orders";
import type {
  Order,
  OrderItem,
  OrderWithItems,
} from "../../shared/contracts/orders";
import type { Product } from "../../shared/contracts/products";
import { sql } from "../db";

async function getOrderWithItems(
  orderId: number
): Promise<OrderWithItems | null> {
  const [order] = await sql<Order[]>`
    SELECT * FROM orders WHERE id = ${orderId}
  `;

  if (!order) return null;

  const items = await sql<OrderItem[]>`
    SELECT oi.*, p.name AS product_name, p.sku AS product_sku
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
  `;

  return { ...order, items };
}

export const ordersRouter = tsr.router(ordersContract, {
  list: async () => {
    const orders = await sql<Order[]>`
      SELECT * FROM orders ORDER BY created_at DESC
    `;

    return { status: 200, body: orders };
  },

  get: async ({ params }) => {
    const order = await getOrderWithItems(params.id);

    if (!order) return { status: 404, body: { message: "Order not found" } };

    return { status: 200, body: order };
  },

  create: async ({ body }) => {
    // Look up current prices for all requested products
    const productIds = body.items.map((i) => i.productId);
    const products = await sql<Product[]>`
      SELECT * FROM products WHERE id IN ${sql(productIds)}
    `;
    const priceMap = new Map(products.map((p) => [p.id, p.price_cents]));

    // Create the order
    const [order] = await sql<Order[]>`
      INSERT INTO orders (status) VALUES ('completed') RETURNING *
    `;

    // Insert line items with snapshotted prices
    for (const item of body.items) {
      const price = priceMap.get(item.productId);
      if (price === undefined) continue;

      await sql`
        INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
        VALUES (${order!.id}, ${item.productId}, ${item.quantity}, ${price})
      `;
    }

    const result = await getOrderWithItems(order!.id);
    return { status: 201, body: result! };
  },
});
