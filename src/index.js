import { Database } from "./database";
import { aql } from "./aql-query";

module.exports = function arangojs(...args) {
  return new Database(...args);
};

module.exports.Database = Database;
module.exports.aql = aql;
