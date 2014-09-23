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
  this.name = this._connection.databaseName;
}

extend(Database.prototype, {
  createCollection: function (properties, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('collection', properties, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, new Collection(self._connection, body));
    });
  },
  collection: function (collectionName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else if (body.error) {
        if (!autoCreate || body.errorNum !== 1203) callback(new ArangoError(body));
        else self.createCollection({name: collectionName}, callback);
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
  dropCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.delete('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null);
    });
  },
  createDatabase: function (databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('database', {name: databaseName}, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        ));
      }
    });
  },
  database: function (databaseName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('../' + databaseName + '/database/current', function (err, body) {
      if (err) callback(err);
      else if (body.error) {
        if (!autoCreate || body.errorNum !== 1228) callback(new ArangoError(body));
        else self.createDatabase(databaseName, callback);
      }
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        ));
      }
    });
  },
  databases: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('database', function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, map(body.result, function (databaseName) {
        return new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        ));
      }));
    });
  },
  dropDatabase: function (databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.delete('database/' + databaseName, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null);
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
