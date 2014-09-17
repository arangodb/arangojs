/* jshint browserify: true, -W079 */
"use strict";

var Promise = require('promise-es6').Promise,
  extend = require('extend'),
  map = require('array-map'),
  Connection = require('./connection'),
  ArangoError = require('./error'),
  ArrayCursor = require('./cursor'),
  Collection = require('./collection'),
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
  createCollection: function (properties, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.post('collection', properties, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(new Collection(self._connection, body));
      });
    });
  },
  collection: function (collectionName, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection/' + collectionName, function (err, body) {
        if (err) reject(err);
        else if (body.error) {
          if (body.errorNum === 1203) {
            self.createCollection({name: collectionName})
            .then(resolve, reject);
          }
          else reject(new ArangoError(body));
        }
        else resolve(new Collection(self._connection, body));
      });
    });
  },
  collections: function (excludeSystem, callback) {
    if (typeof excludeSystem === 'function') {
      callback = excludeSystem;
      excludeSystem = undefined;
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection', {
        excludeSystem: excludeSystem
      }, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(map(body.collections, function (data) {
          return new Collection(self._connection, data);
        }));
      });
    });
  },
  truncate: function (callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection', function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else {
          Promise.all(map(
            body.collections,
            function (data) {
              return new Promise(function (resolve, reject) {
                self._connection.put('collection/' + data.name + '/truncate', function (err, body) {
                  if (err) reject(err);
                  else if (body.error) reject(new ArangoError(body));
                  else resolve(body);
                });
              });
            }
          )).then(resolve, reject);
        }
      });
      self.collections().then(function (collections) {
        Promise.all(map(collections, function (collection) {
          return collection.truncate();
        })).then(resolve, reject);
      }, reject);
    });
  },
  query: function (query, bindVars, callback) {
    if (typeof bindVars === 'function') {
      callback = bindVars;
      bindVars = undefined;
    }
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.post('cursor', {
        query: query,
        bindVars: bindVars
      }, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(new ArrayCursor(self._connection, body));
      });
    });
  }
});
