import { aql } from "./aql";
import { CollectionStatus, CollectionType } from "./collection";
import { Config } from "./config";
import { Database } from "./database";
import { ArangoError } from "./error";
import { ViewType } from "./view";

export default function arangojs(config?: Config) {
  return new Database(config);
}

Object.assign(arangojs, {
  ArangoError,
  CollectionStatus,
  CollectionType,
  ViewType,
  Database,
  aql
});

export {
  ArangoError,
  CollectionStatus,
  CollectionType,
  ViewType,
  Database,
  aql
};
