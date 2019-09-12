export type Errback<T> = (err: Error | null, result?: T) => void;

export type Patch<T> = { [K in keyof T]?: T[K] | Patch<T[K]> };

export type StrictObject<T> = { [K in keyof T]: T[K] };

export interface ArangoResponseMetadata {
  [key: string]: any | undefined;
  error: false;
  code: number;
}
