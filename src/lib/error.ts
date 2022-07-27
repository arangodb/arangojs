/**
 * Wrapper around the `es6-error` module.
 *
 * @packageDocumentation
 * @internal
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Es6Error = require("es6-error");

/**
 * @internal
 */
export const ExtendableError: typeof Error = Es6Error.default || Es6Error;

/**
 * @internal
 */
export type ExtendableError = typeof Error;
