import { Database } from "./database";
import { aql } from "./aql-query";

export default function arangojs(config: any) {
  return new Database(config);
}

Object.assign(arangojs, { Database, aql });
export { Database, aql };
