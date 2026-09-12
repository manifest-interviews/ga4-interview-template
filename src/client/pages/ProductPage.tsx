import { useEffect, useState } from "react";
import { tsr } from "../tsr";
import { Link } from "../router";
import { Wait } from "../components/Wait";
import { formatPrice } from "../helpers";
import { Button } from "../components/Button";
import { ProductForm } from "../components/ProductForm";
import type { Product } from "../../shared/contracts/products";
import { viewItem } from "../analytics";

export function ProductPage({ productId }: { productId: number }) {
  const query = tsr.products.get.useQuery({
    queryKey: ["products", productId],
    queryData: { params: { id: productId } },
  });

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link
        to={{ name: "products" }}
        className="text-zinc-400 hover:text-white transition-colors mb-6 inline-block"
      >
        &larr; Back to products
      </Link>

      <Wait for={query}>
        {(data) => <ProductDetail product={data.body} productId={productId} />}
      </Wait>
    </div>
  );
}

function ProductDetail({
  product,
  productId,
}: {
  product: Product;
  productId: number;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    viewItem(product);
  }, [product.id]);

  const tsrQueryClient = tsr.useQueryClient();

  const { mutate: updateProduct } = tsr.products.update.useMutation({
    onSuccess: () => {
      tsrQueryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(false);
    },
  });

  if (editing) {
    return (
      <ProductForm
        initialValues={product}
        submitLabel="Save"
        onSubmit={(body) =>
          updateProduct({ params: { id: productId }, body })
        }
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
      <p className="text-zinc-500 text-sm mb-1">SKU: {product.sku}</p>
      <p className="text-zinc-400 text-lg mb-4">
        {formatPrice(product.price_cents)}
      </p>
      <p className="text-zinc-500 text-sm mb-6">
        Added {new Date(product.created_at).toLocaleDateString()}
      </p>
      <Button variant="secondary" onClick={() => setEditing(true)}>
        Edit
      </Button>
    </div>
  );
}
