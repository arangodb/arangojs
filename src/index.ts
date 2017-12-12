import { Database } from "./database";
import { aql } from "./aql-query";

module.exports = function arangojs(config: any) {
  return new Database(config);
};

module.exports.Database = Database;
module.exports.aql = aql;
