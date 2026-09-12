# Manifest Interview App

A cafe point-of-sale system. Products, orders, and a checkout flow are already
built — you'll extend and build on top of it during the interview.

**Please do not fork this repository.**  Just clone it locally.

## Preparing for the interview

Please clone this repo and get the app running locally with the steps below.

Install [bun](https://bun.com/) (Node.js-compatible runtime) and dependencies, and start a development server:

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash
# Install dependencies
bun install
# Dev server
bun dev
```

Make sure you can access the app at [http://localhost:3001/](http://localhost:3001/).

Finally, install [Claude Code](https://code.claude.com/docs/en/quickstart):

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

We'll provide you with Claude API keys at the start of the interview. You may use a different tool (e.g., Cursor, Codex) using your own subscription if you prefer.

Feel free to explore the repo beforehand. The stack is intentionally light. You're welcome to add
libraries (a component library, an ORM, etc.) before or during the interview to make yourself more
productive. We naturally expect you to cut corners in an interview that you wouldn't cut in
production.

## Stack overview

- **Runtime:** [Bun](https://bun.sh) — server, bundler, and package manager in one
- **Database:** SQLite via Bun's built-in [SQL client](https://bun.com/docs/runtime/sql) (tagged template literals)
- **API:** [ts-rest](https://ts-rest.com) — type-safe contracts shared between server and client, with Zod validation
- **Frontend:** React 19, Tailwind CSS, React Query (auto-generated hooks from ts-rest contracts)

## Analytics

The app reports the ordering funnel to GA4 through Google Tag Manager.

```
app  ──push──▸  window.dataLayer  ──▸  GTM container  ──▸  GA4
```

Nothing calls GA4 directly. `src/client/analytics/` builds GA4 ecommerce
events and pushes them onto the data layer; the GTM container decides which
become GA4 events and how their fields map. A change to the payload shape is
therefore only half a change — the container has to agree.

Events: `view_item_list`, `view_item`, `add_to_cart`, `remove_from_cart`,
`begin_checkout`, `purchase`.

Setup:

```bash
cp .env.example .env   # container and measurement IDs
bun dev
```

If `BUN_PUBLIC_GTM_CONTAINER_ID` is unset the app still runs and events still
queue on `window.dataLayer` — they just don't reach GA4.

To watch events as they fire, use **GTM Preview** (Preview in the container,
pointed at `http://localhost:3001`). It shows tag firing and full data layer
contents in the browser, with no GA4 round trip. `window.dataLayer` is also
readable straight from the browser console.

## Adding a feature end-to-end

The products and orders features are complete working examples. To add a new resource, follow the same pattern:

1. **DB Schema** — update `src/server/schema.sql` as needed (table definitions and seed data live in the same file)
   - The server detects changes and drops and recreates all tables with fresh seed data. No db migrations.
2. **Contract** — define routes and Zod schemas under `src/shared/contracts/`, then register it in `src/shared/contract.ts`
3. **Handlers** — implement the contract in a new file under `src/server/api/`, then register it in `src/server/api/index.ts`
4. **Page** — add a React component in `src/client/pages/`, then register it in `src/client/pages/index.tsx`

API responses are validated against the Zod contracts at runtime, so schema mismatches surface immediately.
