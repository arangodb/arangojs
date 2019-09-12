import { aql } from "./aql-query";
import { CollectionStatus, CollectionType } from "./collection";
import { Config } from "./connection";
import { Database } from "./database";
import { ArangoError } from "./error";

export default Object.assign(
  function arangojs(config: Config) {
    return new Database(config);
  },
  { ArangoError, CollectionStatus, CollectionType, Database, aql }
);

export * from "./aql-query";
export * from "./collection";
export * from "./cursor";
export * from "./graph";
export * from "./route";
export * from "./util/types";
export * from "./view";
export { ArangoError, Config, Database, aql };
