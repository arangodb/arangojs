/**
 * Wrapper around the browser-specific implementation of the path module.
 *
 * @packageDocumentation
 * @internal
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require("path-browserify");

/**
 * @internal
 */
export function joinPath(...path: string[]): string {
  return join(...path);
}
