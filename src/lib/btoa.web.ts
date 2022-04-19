/**
 * Wrapper around browser `btoa` function to allow substituting a
 * Node.js-specific implementation.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

/**
 * @internal
 * @hidden
 */
export function base64Encode(str: string): string {
  return btoa(str);
}
