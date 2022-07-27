/**
 * Node.js implementation of browser `btoa` function.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
export function base64Encode(str: string) {
  return Buffer.from(str).toString("base64");
}
