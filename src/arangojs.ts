import { aql } from "./aql-query";
import { CollectionType } from "./collection";
import { Config } from "./connection";
import { Database } from "./database";
import { ArangoError } from "./error";

export default function arangojs(config: Config) {
  return new Database(config);
}

Object.assign(arangojs, { CollectionType, ArangoError, Database, aql });
export { DocumentCollection, EdgeCollection } from "./collection";
export { Graph } from "./graph";
export { Database, aql };
