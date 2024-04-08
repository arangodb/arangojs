/**
 * Helper to merge two path segments.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
export function joinPath(
  basePath: string | undefined,
  path: string | undefined
): string | undefined {
  if (!basePath) return path;
  if (!path) return basePath;
  if (!basePath.endsWith("/")) basePath += "/";
  return basePath + path.replace(/^\//g, "");
}
