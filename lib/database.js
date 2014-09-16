/* jshint browserify */
"use strict";

var Connection = require('./connection');
var Promise = require('promise-es6').Promise;

function promisify(callback, deferred) {
  var promise = new Promise(deferred);
  if (callback) {
    promise.then(
      function (result) {
        callback(null, result);
      },
      function (reason) {
        callback(reason);
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
  query: function (queryString, bindVars, callback) {
    return promisify(callback, function (resolve, reject) {
      if (typeof bindVars === 'function') {
        callback = bindVars;
        bindVars = undefined;
      }
      this._connection.post({
        path: 'cursor',
        query: queryString,
        bindVars: bindVars
      }, function (err, res, body) {
        if (err) reject(err);
        else resolve(body);
      });
    });
  }
});