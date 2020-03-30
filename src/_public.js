"use strict";
const { aql } = require("./aql");
const { CollectionStatus, CollectionType } = require("./collection");
const { Database } = require("./database");
const { ArangoError } = require("./error");
const { ViewType } = require("./view");

module.exports = function arangojs(config) {
  return new Database(config);
};
module.exports.default = module.exports;
module.exports.ArangoError = ArangoError;
module.exports.CollectionStatus = CollectionStatus;
module.exports.CollectionType = CollectionType;
module.exports.ViewType = ViewType;
module.exports.Database = Database;
module.exports.aql = aql;

Object.defineProperty(module.exports, "__esModule", { value: true });
