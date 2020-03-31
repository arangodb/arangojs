/**
 * `import arangojs, { aql, Database } from "arangojs"`
 *
 * The "index" module is the default entry point when importing the arangojs
 * module or using the web build in the browser.
 *
 * If you are just getting started, you probably want to use the
 * {@link arangojs} function, which is the default export of this module,
 * or the {@link Database} class for which it is a wrapper.
 *
 * @packageDocumentation
 */
import { aql } from "./aql";
import { CollectionStatus, CollectionType } from "./collection";
import { Config } from "./config";
import { Database } from "./database";
import { ArangoError } from "./error";
import { ViewType } from "./view";

/**
 * Creates a new `Database` instance.
 *
 * If `config` is a string or array of strings, it will be interpreted as
 * {@link Config.url}.
 *
 * This is a wrapper function for the {@link Database.constructor}.
 *
 * @param config An object with configuration options.
 */
export default function arangojs(config?: string | string[] | Config) {
  return new Database(config);
}

arangojs.ArangoError = ArangoError;
arangojs.CollectionStatus = CollectionStatus;
arangojs.CollectionType = CollectionType;
arangojs.ViewType = ViewType;
arangojs.Database = Database;
arangojs.aql = aql;

export { aql } from "./aql";
export { CollectionStatus, CollectionType } from "./collection";
export { Database } from "./database";
export { ArangoError } from "./error";
export { ViewType } from "./view";
