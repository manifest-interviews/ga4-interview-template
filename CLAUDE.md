# Cafe POS - browser-only analytics sandbox

This repository hosts a static ecommerce simulation for GA4/GTM interviews. Candidates do not work in the repository. Maintain a predictable, testable data layer rather than adding application features.

## Structure

- `public/index.html`: static entrypoint, sandbox GTM loader.
- `public/catalog.js`: fixed menu, integer-cent prices.
- `public/analytics.js`: versioned data-layer contract and event emitters.
- `public/checkout.js`: deterministic approved/declined sandbox outcome.
- `public/app.js`, `public/styles.css`: minimal browser UI.
- `docs/data-layer-contract.md`: authoritative public event specification.
- `tests/`: Node built-in tests; `npm run check` validates them.

## Guidelines

- The app must remain deployable as static files to Vercel, without server, database, build dependencies or secrets.
- No direct GA4 calls. Only emit to `window.dataLayer`. GTM owns tagging and conversion mapping.
- Preserve stable SKU-based item IDs and major-unit prices. Maintain `value_cents` for clear cross-system reconciliation.
- Never emit `purchase` directly from the app or emit `order_completed` for a failed attempt.
- If changing an event, update the contract docs and automated tests together.
- Do not put interviewer answers, broken tag definitions, or scoring rubrics in this public candidate-facing repository.
