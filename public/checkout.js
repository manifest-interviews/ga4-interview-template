import { emitOrderCompleted, emitOrderFailed, emitOrderSubmitted } from "./analytics.js";

export const TEST_PAYMENTS = Object.freeze({ APPROVED: "approved", DECLINED: "declined" });

function newId(prefix) {
  // HTTPS and localhost support randomUUID; keep a secure fallback for previews.
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : [...crypto.getRandomValues(new Uint8Array(16))]
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${id}`;
}

/**
 * Simulates a single checkout attempt without a backend or real payment data.
 * All outcomes are deterministic based on the selected sandbox payment option.
 * IDs are unique per attempt and per successful transaction.
 */
export async function submitTestOrder(lines, paymentOutcome, options = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("Cannot submit an empty order");
  }
  if (!Object.values(TEST_PAYMENTS).includes(paymentOutcome)) {
    throw new Error("Unknown test payment outcome");
  }

  const idFactory = options.idFactory ?? newId;
  const now = options.now ?? (() => new Date().toISOString());
  const attemptId = idFactory("ATTEMPT");
  const items = lines.map(({ product, quantity }) => ({ product, quantity }));

  emitOrderSubmitted(items, attemptId);

  // Keep submission and completion separate, as with a real async checkout.
  const delayMs = options.delayMs ?? 300;
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));

  if (paymentOutcome === TEST_PAYMENTS.DECLINED) {
    emitOrderFailed(items, attemptId, "payment_declined");
    return { ok: false, attemptId, reason: "payment_declined" };
  }

  const transactionId = idFactory("TEST");
  const totalCents = items.reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
  const order = {
    transaction_id: transactionId,
    created_at: now(),
    total_cents: totalCents,
    items: items.map(({ product, quantity }) => ({
      sku: product.sku,
      name: product.name,
      price_cents: product.price_cents,
      quantity,
    })),
  };

  emitOrderCompleted(items, attemptId, transactionId);
  return { ok: true, attemptId, order };
}
