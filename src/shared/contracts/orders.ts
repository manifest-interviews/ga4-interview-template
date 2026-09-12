import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const OrderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  product_name: z.string(),
  product_sku: z.string(),
  quantity: z.number(),
  unit_price_cents: z.number(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.number(),
  status: z.string(),
  created_at: z.string(),
});

export type Order = z.infer<typeof OrderSchema>;

export const OrderWithItemsSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
});

export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;

export const ordersContract = c.router({
  list: {
    method: "GET",
    path: "/api/orders",
    responses: {
      200: z.array(OrderSchema),
    },
  },
  get: {
    method: "GET",
    path: "/api/orders/:id",
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    responses: {
      200: OrderWithItemsSchema,
      404: z.object({ message: z.string() }),
    },
  },
  create: {
    method: "POST",
    path: "/api/orders",
    body: z.object({
      items: z.array(
        z.object({
          productId: z.number(),
          quantity: z.number().int().min(1),
        })
      ),
    }),
    responses: {
      201: OrderWithItemsSchema,
    },
  },
});
