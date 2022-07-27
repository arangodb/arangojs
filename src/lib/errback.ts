/**
 * Errback utility type.
 *
 * @packageDocumentation
 * @internal
 */
/**
 * Type representing a Node.js error-first callback.
 *
 * @param T - Type of the optional result value.
 *
 * @internal
 */
export type Errback<T = never> = (err: Error | null, result?: T) => void;
