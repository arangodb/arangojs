/* jshint browserify */
"use strict";

var extend = require('extend');
var Promise = require('promise-es6').Promise;
var Connection = require('./connection');
var ArangoError = require('./error');

function promisify(callback, deferred) {
  var promise = new Promise(deferred);
  if (callback) {
    return promise.then(
      function (result) {
        return callback(null, result);
      },
      function (reason) {
        return callback(reason);
      }
    );
  }
  return promise;
}

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
        else resolve(body);
      });
    });
  }
});