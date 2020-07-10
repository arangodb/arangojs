/**
 * Errback utility type.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */
/**
 * Type representing a Node.js error-first callback.
 *
 * @param T - Type of the optional result value.
 *
 * @internal
 * @hidden
 */
export type Errback<T = never> = (err: Error | null, result?: T) => void;
