/**
 * Node.js implementation of browser `btoa` function.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

/**
 * @internal
 * @hidden
 */
export function btoa(str: string) {
  return Buffer.from(str).toString("base64");
}
