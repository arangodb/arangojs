/**
 * Wrapper around the browser-compatible implementation of the path module.
 *
 * @packageDocumentation
 * @internal
 */

import { posix } from "path";

/**
 * @internal
 */
export const joinPath = posix.join;
