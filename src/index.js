import Database from "./database";
import aqlQuery from "./aql-query";

module.exports = (...args) => new Database(...args);
module.exports.Database = Database;
module.exports.aqlQuery = module.exports.aql = aqlQuery;
