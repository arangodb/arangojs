"use strict";
const { aql } = require("./aql-query");
const { CollectionStatus, CollectionType } = require("./collection");
const { Database } = require("./database");
const { ArangoError } = require("./error");
const { ViewType } = require("./view");

module.exports = Object.assign(
  function arangojs(config) {
    return new Database(config);
  },
  { ArangoError, CollectionStatus, CollectionType, ViewType, Database, aql }
);
module.exports.default = module.exports;
Object.defineProperty(module.exports, "__esModule", { value: true });
