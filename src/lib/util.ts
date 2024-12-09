/**
 * Utility functions for arangojs.
 *
 * @packageDocumentation
 * @internal
 */

const THIRTY_MINUTES = 30 * 60_000;

/**
 * @internal
 *
 * Helper to merge path segments.
 */
export function joinPath(
  ...pathList: (string | undefined)[]
): string {
  if (!pathList.length) return "";
  return pathList.flatMap((path, i) => {
    if (!path) return [];
    if (i === pathList.length - 1) {
      if (i === 0) return [path];
      return [path.replace(/^\/+/, "")];
    }
    if (i === 0) return [path.replace(/\/+$/, "")];
    return [path.replace(/^\/+|\/+$/, "")];
  }).join("/");
}

/**
 * @internal
 *
 * Utility function for merging headers.
 */
export function mergeHeaders(
  ...headersList: (Headers | string[][] | Record<string, string | ReadonlyArray<string>> | undefined)[]
) {
  if (!headersList.length) return new Headers();
  return new Headers([
    ...headersList.flatMap(headers => headers ? [
      ...((headers instanceof Headers || Array.isArray(headers)) ? headers : new Headers(headers))
    ] : []),
  ]);
}

/**
 * @internal
 *
 * Utility function for normalizing URLs.
 */
export function normalizeUrl(url: string): string {
  const raw = url.match(/^(tcp|ssl|tls)((?::|\+).+)/);
  if (raw) url = (raw[1] === "tcp" ? "http" : "https") + raw[2];
  const unix = url.match(/^(?:(http|https)\+)?unix:\/\/(\/.+)/);
  if (unix) url = `${unix[1] || "http"}://unix:${unix[2]}`;
  else if (!url.endsWith('/')) url += '/';
  return url;
}

/**
 * @internal
 *
 * Generate a unique request ID.
 */
export function generateRequestId() {
  return `${Date.now() % THIRTY_MINUTES}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * @internal
 *
 * Creates a timer that will call the given callback after the specified
 * timeout.
 *
 * @param timeout - Number of milliseconds after which the callback will be
 *   called.
 * @param callback - Callback to call after the timeout.
 * @returns A function that clears the timer.
 */
export function createTimer(timeout: number, callback: () => void) {
  const t = setTimeout(callback, timeout);
  return () => clearTimeout(t);
}

/**
 * @internal
 *
 * Generates a stack trace.
 */
export function generateStackTrace() {
  let err = new Error();
  if (!err.stack) {
    try {
      throw err;
    } catch (e: any) {
      err = e;
    }
  }
  return err;
}
