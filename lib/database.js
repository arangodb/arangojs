/*jshint browserify: true, -W079 */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  map = require('array-map'),
  Connection = require('./connection'),
  ArangoError = require('./error'),
  ArrayCursor = require('./cursor'),
  Collection = require('./collection'),
  all = require('./util/all');

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
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('collection', properties, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, new Collection(self._connection, body));
    });
  },
  collection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else if (body.error) {
        if (body.errorNum === 1203) {
          self.createCollection({name: collectionName}, callback);
        }
        else callback(new ArangoError(body));
      }
      else callback(null, new Collection(self._connection, body));
    });
  },
  collections: function (excludeSystem, callback) {
    if (typeof excludeSystem === 'function') {
      callback = excludeSystem;
      excludeSystem = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection', {
      excludeSystem: excludeSystem
    }, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, map(body.collections, function (data) {
        return new Collection(self._connection, data);
      }));
    });
  },
  truncate: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection', function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else {
        all(map(body.collections, function (data) {
          return function (cb) {
            self._connection.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);
              else if (body.error) cb(new ArangoError(body));
              else cb(null, body);
            });
          };
        }), callback);
      }
    });
  },
  query: function (query, bindVars, callback) {
    if (typeof bindVars === 'function') {
      callback = bindVars;
      bindVars = undefined;
    }
    if (!callback) callback = noop;
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    self._connection.post('cursor', {
      query: query,
      bindVars: bindVars
    }, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, new ArrayCursor(self._connection, body));
    });
  }
});
