export type Errback<T> = (err: Error | null, result?: T) => void;
