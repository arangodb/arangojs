"use strict";
const { aql } = require("./aql");
const { CollectionStatus, CollectionType } = require("./collection");
const { ViewType } = require("./view");
const { Database } = require("./database");

module.exports = exports = arangojs;

function arangojs(config) {
  if (typeof config === "string" || Array.isArray(config)) {
    const url = config;
    return new Database(url);
  }
  return new Database(config);
}

Object.assign(arangojs, {
  aql,
  arangojs,
  CollectionStatus,
  CollectionType,
  Database,
  ViewType,
});
