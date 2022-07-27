/**
 * Blob type, equivalent to `Buffer` for browser-like environments.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @internal
 */
export interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): any;
  text(): Promise<string>;
}
