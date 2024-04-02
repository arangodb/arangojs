/**
 * Utility function for merging headers.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
export function mergeHeaders(
  base: Headers,
  extra: Headers | Record<string, string> | undefined
) {
  if (!extra) return base;
  return new Headers([
    ...base,
    ...(extra instanceof Headers ? extra : Object.entries(extra)),
  ]);
}
