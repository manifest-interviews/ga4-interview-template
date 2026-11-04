# Deployment guide: static Cafe POS

1. Create a new Vercel project from the interview repository (or update its existing project after review).
2. Use Framework Preset **Other** and Root Directory **`./`**.
3. `vercel.json` sets `outputDirectory` to `public` and does not run a compiler/build. The deployed files are static.
4. Deploy the review branch as a preview first, not directly to production.
5. Confirm `/`, `/app.js`, `/catalog.js`, `/analytics.js`, `/checkout.js` and `/styles.css` load without errors.
6. Confirm `GTM-W4BK6PG7` is the intended sandbox container in `public/index.html` before using Tag Assistant.
7. Run the success/decline manual checklist from `docs/data-layer-contract.md`.
8. Only after the application contract is stable should a new GTM baseline be constructed and published.

Do not give candidates Vercel or GitHub permissions. The candidate only needs the hosted app and their designated GTM/GA4 access. Clear browser-local state or use a fresh browser profile between interview runs. Events already sent to GA4 persist and must be isolated from the historical reporting case study.
