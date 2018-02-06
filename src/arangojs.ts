import { Config } from "./connection";
import { Database } from "./database";
import { aql } from "./aql-query";

export default function arangojs(config: Config) {
  return new Database(config);
}

Object.assign(arangojs, { Database, aql, default: arangojs });
export { Database, aql };
