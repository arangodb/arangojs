/**
 * Wrapper around the `es6-error` module.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Es6Error = require("es6-error");

/**
 * @internal
 * @hidden
 */
export const ExtendableError: typeof Error = Es6Error.default || Es6Error;

/**
 * @internal
 * @hidden
 */
export type ExtendableError = typeof Error;
