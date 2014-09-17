/* jshint browserify: true */
"use strict";

var extend = require('extend'),
  Connection = require('./connection'),
  ArangoError = require('./error'),
  ArrayCursor = require('./cursor'),
  promisify = require('./util/promisify');

module.exports = Database;

function Database(config) {
  if (!(this instanceof Database)) {
    return new Database(config);
  }
  this._connection = new Connection(config);
}

extend(Database.prototype, {
  use: function (databaseName) {
    this._connection.config.databaseName = databaseName;
  },
  collection: function (collectionName, callback) {
  },
  query: function (query, bindVars, callback) {
    if (typeof bindVars === 'function') {
      callback = bindVars;
      bindVars = undefined;
    }
    var aql = (query && typeof query.toAQL === 'function') ? query.toAQL() : String(query);
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.post('cursor', {
        query: aql,
        bindVars: bindVars
      }, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(new ArrayCursor(self._connection, body));
      });
    });
  }
});
