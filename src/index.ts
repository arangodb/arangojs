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
 * or the {@link Database} class for which it is a wrapper.
 *
 * @packageDocumentation
 */
import { Config } from "./connection";
import { Database } from "./database";

module.exports = exports = arangojs;
/**
 * Creates a new `Database` instance with its own connection pool.
 *
 * This is a wrapper function for the {@link Database.constructor}.
 *
 * @param config - An object with configuration options.
 *
 * @example
 * ```js
 * const db = arangojs({
 *   url: "http://localhost:8529",
 *   databaseName: "myDatabase",
 *   auth: { username: "admin", password: "hunter2" },
 * });
 * ```
 */
export function arangojs(config?: Config): Database;
/**
 * Creates a new `Database` instance with its own connection pool.
 *
 * This is a wrapper function for the {@link Database.constructor}.
 *
 * @param url - Base URL of the ArangoDB server or list of server URLs.
 * Equivalent to the `url` option in {@link Config}.
 *
 * @example
 * ```js
 * const db = arangojs("http://localhost:8529", "myDatabase");
 * db.useBasicAuth("admin", "hunter2");
 * ```
 */
export function arangojs(url: string | string[], name?: string): Database;
export function arangojs(config?: string | string[] | Config, name?: string) {
  if (typeof config === "string" || Array.isArray(config)) {
    const url = config;
    return new Database(url, name);
  }
  return new Database(config);
}
export default arangojs;
export { aql } from "./aql";
export { CollectionStatus, CollectionType } from "./collection";
export { Database } from "./database";
export { ViewType } from "./view";
