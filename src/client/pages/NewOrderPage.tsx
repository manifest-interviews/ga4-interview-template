import { useEffect, useMemo, useState } from "react";
import { tsr } from "../tsr";
import { useCart } from "../cart";
import { useNavigate } from "../router";
import { Wait } from "../components/Wait";
import { formatPrice } from "../helpers";
import { Button } from "../components/Button";
import {
  addToCart,
  beginCheckout,
  purchase,
  removeFromCart,
  toItem,
  viewItemList,
} from "../analytics";

export function NewOrderPage() {
  const query = tsr.products.list.useQuery({ queryKey: ["products"] });
  const { cart, addItem, removeItem, clear } = useCart();
  const navigate = useNavigate();
  const tsrQueryClient = tsr.useQueryClient();

  const [error, setError] = useState<string | null>(null);

  const products = query.data?.status === 200 ? query.data.body : undefined;

  const productsById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );

  useEffect(() => {
    if (products) viewItemList(products, "menu", "Menu");
  }, [products]);

  const { mutate: createOrder, isPending } = tsr.orders.create.useMutation({
    onSuccess: (data) => {
      if (data.status === 201) {
        clear();
        setError(null);
        tsrQueryClient.invalidateQueries({ queryKey: ["orders"] });
        navigate({ name: "order", orderId: data.body.id });
      } else {
        setError("Something went wrong placing the order.");
      }
    },
    onError: () => {
      setError("Server error.");
    },
  });

  const totalItems = [...cart.values()].reduce((sum, qty) => sum + qty, 0);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h1 className="text-3xl font-bold mb-8">New Order</h1>

        <Wait for={query}>
          {(data) => (
            <ul className="space-y-2">
              {data.body.map((product) => {
                const qty = cart.get(product.id) ?? 0;
                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                  >
                    <div>
                      <span className="font-medium">{product.name}</span>
                      <span className="text-zinc-400 ml-3">
                        {formatPrice(product.price_cents)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <>
                          <Button
                            variant="icon"
                            onClick={() => {
                              removeItem(product.id);
                              removeFromCart(product);
                            }}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{qty}</span>
                        </>
                      )}
                      <Button
                        variant="icon"
                        onClick={() => {
                          addItem(product.id);
                          addToCart(product);
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Wait>
      </div>

      <div className="w-72 shrink-0 border-l border-zinc-800 p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Cart</h2>

        {totalItems === 0 ? (
          <p className="text-zinc-500 text-sm">No items yet.</p>
        ) : (
          <Wait for={query}>
            {(data) => {
              const products = new Map(data.body.map((p) => [p.id, p]));
              let total = 0;

              return (
                <div className="flex flex-col flex-1">
                  <ul className="space-y-2 flex-1 overflow-y-auto">
                    {[...cart.entries()].map(([productId, qty]) => {
                      const product = products.get(productId);
                      if (!product) return null;
                      const subtotal = product.price_cents * qty;
                      total += subtotal;
                      return (
                        <li
                          key={productId}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {product.name} x{qty}
                          </span>
                          <span className="text-zinc-400">
                            {formatPrice(subtotal)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <div className="flex justify-between font-semibold mb-4">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                    {error && (
                      <p className="text-red-400 text-sm mb-3">{error}</p>
                    )}
                    <Button
                      className="w-full"
                      disabled={isPending}
                      onClick={() => {
                        const cartItems = [...cart.entries()].flatMap(
                          ([productId, quantity]) => {
                            const product = productsById.get(productId);
                            return product ? [toItem(product, quantity)] : [];
                          },
                        );
                        beginCheckout(cartItems);
                        purchase(cartItems);
                        createOrder({
                          body: {
                            items: [...cart.entries()].map(
                              ([productId, quantity]) => ({
                                productId,
                                quantity,
                              }),
                            ),
                          },
                        });
                      }}
                    >
                      {isPending ? "Placing..." : "Place Order"}
                    </Button>
                  </div>
                </div>
              );
            }}
          </Wait>
        )}
      </div>
    </div>
  );
}
