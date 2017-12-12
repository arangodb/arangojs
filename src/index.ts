import { Database } from "./database";
export { aql } from "./aql-query";
export { Database };

export default function arangojs(config: any) {
  return new Database(config);
}
