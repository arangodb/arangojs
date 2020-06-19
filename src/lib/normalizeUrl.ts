/**
 * Utility function for normalizing URLs.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

/**
 * @internal
 * @hidden
 */
export function normalizeUrl(url: string): string {
  const raw = url.match(/^(tcp|ssl|tls)((?::|\+).+)/);
  if (raw) url = (raw[1] === "tcp" ? "http" : "https") + raw[2];
  const unix = url.match(/^(?:(https?)\+)?unix:\/\/(\/.+)/);
  if (unix) url = `${unix[1] || "http"}://unix:${unix[2]}`;
  return url;
}
