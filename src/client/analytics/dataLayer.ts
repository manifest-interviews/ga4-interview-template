/**
 * The GTM data layer — the single seam between this app and analytics.
 *
 * The app never talks to GA4 directly. It pushes events onto `window.dataLayer`;
 * the GTM container decides which of them become GA4 events and how their
 * fields are mapped. That means a change here is only half a change: the
 * container has to agree on the shape.
 *
 * @see https://developers.google.com/tag-platform/tag-manager/datalayer
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type DataLayerEvent = { event: string } & Record<string, unknown>;

function queue(): Record<string, unknown>[] {
  return (window.dataLayer ??= []);
}

/** Push a raw event onto the data layer. */
export function push(payload: DataLayerEvent) {
  queue().push(payload);
}

/**
 * Push a GA4 ecommerce event.
 *
 * GTM merges each push into one persistent model rather than replacing it, so
 * an `items` array from a previous event survives into the next one and
 * silently contaminates it. Clearing `ecommerce` first is the documented fix.
 *
 * @see https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */
export function pushEcommerce(event: string, ecommerce: Record<string, unknown>) {
  const dl = queue();
  dl.push({ ecommerce: null });
  dl.push({ event, ecommerce });
}
