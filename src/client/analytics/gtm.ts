/**
 * The GTM container is loaded by the inline snippet in `src/index.html`, which
 * is the form Tag Assistant and GTM Preview expect — the container has to be
 * present while the page is parsing, not injected afterwards.
 *
 * All this does is guarantee `window.dataLayer` exists before any application
 * code pushes to it, so events are never dropped on the floor if the container
 * is slow, blocked by an extension, or absent entirely.
 */
export function installGtm() {
  window.dataLayer ??= [];
}
