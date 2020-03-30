/** @hidden */
export type Errback<T> = (err: Error | null, result?: T) => void;

/** @hidden */
export type Patch<T> = { [K in keyof T]?: T[K] | Patch<T[K]> };

/** @hidden */
export type StrictObject<T> = { [K in keyof T]: T[K] };

/** @hidden */
export interface Blob {
  readonly size: number;
  readonly type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice(start?: number, end?: number, contentType?: string): Blob;
  stream(): any;
  text(): Promise<string>;
}
