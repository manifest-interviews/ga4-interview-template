# Manifest Interviews - Cafe POS

A browser-only cafe checkout sandbox for evaluating GA4 / Google Tag Manager troubleshooting.
**Candidates do not need to clone this repository or write application code.**
The facilitator provides a hosted URL and access to the designated GTM workspace.

## What the application does

- Fixed 15-product menu with stable SKUs and integer-cent prices.
- Product list, product detail, add/remove from cart, and checkout interactions.
- Two deterministic sandbox payment outcomes: approved and declined.
- Each checkout emits `order_submitted`; only approved checkouts emit `order_completed` with a unique `transaction_id`.
- Declined checkouts emit `order_failed` and do not create an order.
- Successful orders appear in the Orders screen for the current browser tab only.
- `Reset demo session` clears browser-local orders and reloads the app.

This is a static HTML/CSS/JavaScript app. There is no database, backend, external payment provider, or real customer information.

## Local development (maintainers only)

Node.js 20+ is required for the local static server and tests. No package installation is required.

```sh
npm run dev       # http://localhost:3001
npm run check     # syntax checks plus contract tests
```

### Vercel deployment

Connect this repository to Vercel, select **Other** as the framework preset, and deploy. `vercel.json` sets `public/` as the output directory. No runtime functions, database, secrets, or build tooling are needed.

The public GTM container ID (`GTM-W4BK6PG7`) is embedded in `public/index.html`.
Confirm that the sandbox container is the intended interview container before deployment.
No GA4 measurement ID or API secret belongs in the browser app; GTM controls forwarding events to the GA4 property.

**Important:** Until the new GTM interview baseline is configured, the currently published container does **not** map `order_completed` to GA4 `purchase`. That is intentional during the application-first migration. Do not assess candidates against the old GTM baseline or seed script after deploying this version.

## Data-layer contract

See [docs/data-layer-contract.md](docs/data-layer-contract.md) for the complete event and payload specification, monetary-value conventions, and verification steps.

```text
Browser interaction -> window.dataLayer -> GTM -> GA4
```

The app emits browser events only; it never calls GA4 directly. The order-completion business event is `order_completed`, **not** `purchase`. The GTM container is responsible for translating it to a GA4 `purchase` event with the right parameters.

A simple functional check: add **two Lattes** and **one Croissant**. The correct order value is `$14.75`, `value_cents` is `1475`, and a confirmed order should contain two distinct item entries with quantities 2 and 1.

## Interview repeatability

The frontend has no shared server state. Each browser tab stores completed demo orders in `sessionStorage`. Use a fresh browser profile or the `Reset demo session` button for each run. Resetting the app does **not** delete events already collected by GA4; the facilitator must manage GA4 reference data separately. GTM candidate changes belong in disposable, unpublished workspaces.

The published GTM baseline and internal scoring materials should live in a **private facilitator location**, not in this public candidate repository.
