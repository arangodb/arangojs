import { aql } from "./aql";
import { CollectionStatus, CollectionType } from "./collection";
import { Config } from "./config";
import { Database } from "./database";
import { ArangoError } from "./error";
import { ViewType } from "./view";

export default function arangojs(config?: Config) {
  return new Database(config);
}

arangojs.ArangoError = ArangoError;
arangojs.CollectionStatus = CollectionStatus;
arangojs.CollectionType = CollectionType;
arangojs.ViewType = ViewType;
arangojs.Database = Database;
arangojs.aql = aql;

export {
  ArangoError,
  CollectionStatus,
  CollectionType,
  ViewType,
  Database,
  aql
};
