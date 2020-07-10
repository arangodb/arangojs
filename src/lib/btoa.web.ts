/**
 * Wrapper around browser `btoa` function to allow substituting a
 * Node.js-specific implementation.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

declare const window: any;

/**
 * @internal
 * @hidden
 */
export function btoa(str: string): string {
  return window.btoa(str);
}
