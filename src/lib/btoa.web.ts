/**
 * Wrapper around browser `btoa` function to allow substituting a
 * Node.js-specific implementation.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
export function base64Encode(str: string): string {
  return btoa(str);
}
