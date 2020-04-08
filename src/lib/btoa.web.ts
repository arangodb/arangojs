/**
 * TODO
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
