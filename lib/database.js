/*jshint browserify: true, -W079 */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  map = require('array-map'),
  Connection = require('./connection'),
  ArangoError = require('./error'),
  ArrayCursor = require('./cursor'),
  createCollection = require('./collection'),
  Graph = require('./graph'),
  all = require('./util/all');

module.exports = Database;

function Database(config) {
  if (!(this instanceof Database)) {
    return new Database(config);
  }
  this._connection = new Connection(config);
  this.name = this._connection.config.databaseName;
}

extend(Database.prototype, {
  createCollection: function (properties, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('collection', properties, function (err, body) {
      if (err) callback(err);
      else callback(null, createCollection(self._connection, body));
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
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);
        else self.createCollection({name: collectionName}, callback);
      }
      else callback(null, createCollection(self._connection, body));
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
      else callback(null, map(body.collections, function (data) {
        return createCollection(self._connection, data);
      }));
    });
  },
  dropCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.delete('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null);
    });
  },
  createGraph: function (properties, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('gharial', properties, function (err, body) {
      if (err) callback(err);
      else callback(null, new Graph(self._connection, body.graph));
    });
  },
  graph: function (graphName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('gharial/' + graphName, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);
        else self.createGraph({name: graphName}, callback);
      }
      else callback(null, new Graph(self._connection, body.graph));
    });

  },
  graphs: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('gharial', function (err, body) {
      if (err) callback(err);
      else callback(null, map(body.graphs, function (graph) {
        return new Graph(self._connection, graph);
      }));
    });
  },
  dropGraph: function (graphName, dropCollections, callback) {
    if (typeof dropCollections === 'function') {
      callback = dropCollections;
      dropCollections = undefined;
    }
    if (!callback) callback = noop;
    this._connection.delete('graph/' + graphName, {dropCollections: dropCollections}, callback);
  },
  createDatabase: function (databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.post('database', {name: databaseName}, function (err, body) {
      if (err) callback(err);
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        )));
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
    // FIXME This is a but ugly, isn't it?
    self._connection.get('../../' + databaseName + '/_api/database/current', function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1228) callback(err);
        else self.createDatabase(databaseName, callback);
      }
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        )));
      }
    });
  },
  databases: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('database', function (err, body) {
      if (err) callback(err);
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
      else callback(null);
    });
  },
  truncate: function (excludeSystem, callback) {
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
      else {
        all(map(body.collections, function (data) {
          return function (cb) {
            self._connection.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);
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
      else callback(null, new ArrayCursor(self._connection, body));
    });
  }
});
