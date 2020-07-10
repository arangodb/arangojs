/**
 * Wrapper around the browser-compatible implementation of the path module.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */

import { posix } from "path";

/**
 * @internal
 * @hidden
 */
export const joinPath = posix.join;
