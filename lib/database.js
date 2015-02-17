/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  Connection = require('./connection'),
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
  this._api = this._connection.endpoint('_api');
  this.name = this._connection.config.databaseName;
}

extend(Database.prototype, {
  endpoint: function (path, headers) {
    return this._connection.endpoint(path, headers);
  },
  createCollection: function (properties, callback) {
    if (!callback) callback = noop;
    if (typeof properties === 'string') {
      properties = {name: properties};
    }
    var self = this;
    self._api.post('collection', properties, function (err, body) {
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
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);
        else self.createCollection({name: collectionName}, callback);
      }
      else callback(null, createCollection(self._connection, body));
    });
  },
  collections: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.collections.map(function (data) {
        return createCollection(self._connection, data);
      }));
    });
  },
  allCollections: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.collections.map(function (data) {
        return createCollection(self._connection, data);
      }));
    });
  },
  dropCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.delete('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null);
    });
  },
  createGraph: function (properties, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.post('gharial', properties, function (err, body) {
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
    self._api.get('gharial/' + graphName, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1924) callback(err);
        else self.createGraph({name: graphName}, callback);
      }
      else callback(null, new Graph(self._connection, body.graph));
    });

  },
  graphs: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('gharial', function (err, body) {
      if (err) callback(err);
      else callback(null, body.graphs.map(function (graph) {
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
    this._api.delete('graph/' + graphName, {dropCollections: dropCollections}, callback);
  },
  createDatabase: function (databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.post('database', {name: databaseName}, function (err, body) {
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
    self._connection.request({
      method: 'get',
      path: '/_db/' + databaseName + '/_api/database/current',
      absolutePath: true
    }, function (err, body) {
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
    self._api.get('database', function (err, body) {
      if (err) callback(err);
      else callback(null, body.result.map(function (databaseName) {
        return new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        ));
      }));
    });
  },
  dropDatabase: function (databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.delete('database/' + databaseName, function (err, body) {
      if (err) callback(err);
      else callback(null);
    });
  },
  truncate: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, body) {
      if (err) callback(err);
      else {
        all(body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);
              else cb(null, body);
            });
          };
        }), callback);
      }
    });
  },
  truncateAll: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, body) {
      if (err) callback(err);
      else {
        all(body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);
              else cb(null, body);
            });
          };
        }), callback);
      }
    });
  },
  transaction: function (collections, action, params, lockTimeout, callback) {
    if (typeof lockTimeout === 'function') {
      callback = lockTimeout;
      lockTimeout = undefined;
    }
    if (typeof params === 'function') {
      callback = params;
      params = undefined;
    }
    if (typeof params === 'number') {
      lockTimeout = params;
      params = undefined;
    }
    if (typeof collections === 'string' || Array.isArray(collections)) {
      collections = {write: collections};
    }
    if (!callback) callback = noop;
    this._api.post('transaction', {
      collections: collections,
      action: action,
      params: params,
      lockTimeout: lockTimeout
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.result);
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
    self._api.post('cursor', {
      query: query,
      bindVars: bindVars
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, body));
    });
  },
  functions: function (callback) {
    if (!callback) callback = noop;
    this._api.get('aqlfunction', function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  createFunction: function (name, code, callback) {
    this._api.post('aqlfunction', {
      name: name,
      code: code
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  dropFunction: function (name, group, callback) {
    if (typeof group === 'function') {
      callback = group;
      group = undefined;
    }
    this._api.delete('aqlfunction/' + name, {
      group: Boolean(group)
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});
