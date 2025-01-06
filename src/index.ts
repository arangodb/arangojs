/**
 * ```js
 * import arangojs, { aql, Database } from "arangojs";
 * ```
 *
 * The "index" module is the default entry point when importing the arangojs
 * module or using the web build in the browser.
 *
 * If you are just getting started, you probably want to use the
 * {@link arangojs} function, which is also the default export of this module,
 * or the {@link databases.Database} class for which it is a wrapper.
 *
 * @packageDocumentation
 */
import * as configuration from "./configuration.js";
import * as databases from "./databases.js";

if (typeof module !== "undefined" && typeof exports !== "undefined") {
  module.exports = exports = arangojs;
}
/**
 * Creates a new `Database` instance with its own connection pool.
 *
 * This is a wrapper function for the {@link databases.Database:constructor}.
 *
 * @param config - An object with configuration options.
 *
 * @example
 * ```js
 * const db = arangojs({
 *   url: "http://127.0.0.1:8529",
 *   databaseName: "myDatabase",
 *   auth: { username: "admin", password: "hunter2" },
 * });
 * ```
 */
export function arangojs(
  config?: configuration.ConfigOptions,
): databases.Database;
/**
 * Creates a new `Database` instance with its own connection pool.
 *
 * This is a wrapper function for the {@link databases.Database:constructor}.
 *
 * @param url - Base URL of the ArangoDB server or list of server URLs.
 * Equivalent to the `url` option in {@link configuration.ConfigOptions}.
 *
 * @example
 * ```js
 * const db = arangojs("http://127.0.0.1:8529", "myDatabase");
 * db.useBasicAuth("admin", "hunter2");
 * ```
 */
export function arangojs(
  url: string | string[],
  name?: string,
): databases.Database;
export function arangojs(
  config?: string | string[] | configuration.ConfigOptions,
  name?: string,
) {
  if (typeof config === "string" || Array.isArray(config)) {
    const url = config;
    return new databases.Database(url, name);
  }
  return new databases.Database(config);
}
export default arangojs;
export { aql } from "./aql.js";
export { Database } from "./databases.js";
