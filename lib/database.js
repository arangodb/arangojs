'use strict';
var extend = require('extend');
var Connection = require('./connection');
var ArrayCursor = require('./cursor');
var ArangoError = require('./error');
var _createCollection = require('./collection');
var Graph = require('./graph');
var all = require('./util/all');

var types = _createCollection.types;

module.exports = Database;

function Database(config) {
  if (!(this instanceof Database)) {
    return new Database(config);
  }
  this._connection = new Connection(config);
  this._api = this._connection.route('_api');
  this.name = this._connection.config.databaseName;
}

extend(Database.prototype, {
  route: function route(path, headers) {
    return this._connection.route(path, headers);
  },
  createCollection: function createCollection(properties, cb) {
    var _connection$promisify = this._connection.promisify(cb);

    var promise = _connection$promisify.promise;
    var callback = _connection$promisify.callback;

    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({
      type: types.DOCUMENT_COLLECTION
    }, properties), function (err, res) {
      if (err) callback(err);else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  },
  createEdgeCollection: function createEdgeCollection(properties, cb) {
    var _connection$promisify2 = this._connection.promisify(cb);

    var promise = _connection$promisify2.promise;
    var callback = _connection$promisify2.callback;

    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({}, properties, { type: types.EDGE_COLLECTION }), function (err, res) {
      if (err) callback(err);else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  },
  collection: function collection(collectionName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }

    var _connection$promisify3 = this._connection.promisify(cb);

    var promise = _connection$promisify3.promise;
    var callback = _connection$promisify3.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);else {
          self.createCollection({ name: collectionName }, function (err, collection) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);else self.collection(collectionName, callback);
            } else callback(null, collection);
          });
        }
      } else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  },
  edgeCollection: function edgeCollection(collectionName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }

    var _connection$promisify4 = this._connection.promisify(cb);

    var promise = _connection$promisify4.promise;
    var callback = _connection$promisify4.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);else {
          self.createEdgeCollection({ name: collectionName }, function (err, collection) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);else self.edgeCollection(collectionName, callback);
            } else callback(null, collection);
          });
        }
      } else if (res.body.type !== types.EDGE_COLLECTION) {
        callback(new ArangoError({
          code: 400,
          errorNum: 1237,
          errorMessage: 'wrong collection type'
        }));
      } else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  },
  collections: function collections(cb) {
    var _connection$promisify5 = this._connection.promisify(cb);

    var promise = _connection$promisify5.promise;
    var callback = _connection$promisify5.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.collections.map(function (data) {
          return _createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  },
  allCollections: function allCollections(cb) {
    var _connection$promisify6 = this._connection.promisify(cb);

    var promise = _connection$promisify6.promise;
    var callback = _connection$promisify6.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.collections.map(function (data) {
          return _createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  },
  dropCollection: function dropCollection(collectionName, cb) {
    var _connection$promisify7 = this._connection.promisify(cb);

    var promise = _connection$promisify7.promise;
    var callback = _connection$promisify7.callback;

    var self = this;
    self._api['delete']('collection/' + collectionName, function (err, res) {
      if (err) callback(err);else callback(null);
    });
    return promise;
  },
  createGraph: function createGraph(properties, cb) {
    var _connection$promisify8 = this._connection.promisify(cb);

    var promise = _connection$promisify8.promise;
    var callback = _connection$promisify8.callback;

    var self = this;
    self._api.post('gharial', properties, function (err, res) {
      if (err) callback(err);else callback(null, new Graph(self._connection, res.body.graph));
    });
    return promise;
  },
  graph: function graph(graphName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }

    var _connection$promisify9 = this._connection.promisify(cb);

    var promise = _connection$promisify9.promise;
    var callback = _connection$promisify9.callback;

    var self = this;
    self._api.get('gharial/' + graphName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1924) callback(err);else {
          self.createGraph({ name: graphName }, function (err, graph) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1925) callback(err);else self.graph(graphName, callback);
            } else callback(null, graph);
          });
        }
      } else callback(null, new Graph(self._connection, res.body.graph));
    });
    return promise;
  },
  graphs: function graphs(cb) {
    var _connection$promisify10 = this._connection.promisify(cb);

    var promise = _connection$promisify10.promise;
    var callback = _connection$promisify10.callback;

    var self = this;
    self._api.get('gharial', function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.graphs.map(function (graph) {
          return new Graph(self._connection, graph);
        }));
      }
    });
    return promise;
  },
  dropGraph: function dropGraph(graphName, dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }

    var _connection$promisify11 = this._connection.promisify(cb);

    var promise = _connection$promisify11.promise;
    var callback = _connection$promisify11.callback;

    this._api['delete']('graph/' + graphName, { dropCollections: dropCollections }, callback);
    return promise;
  },
  createDatabase: function createDatabase(databaseName, users, cb) {
    if (typeof users === 'function') {
      cb = users;
      users = undefined;
    }

    var _connection$promisify12 = this._connection.promisify(cb);

    var promise = _connection$promisify12.promise;
    var callback = _connection$promisify12.callback;

    var self = this;
    self._api.post('database', {
      name: databaseName,
      users: users
    }, function (err, res) {
      if (err) callback(err);else {
        callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
      }
    });
    return promise;
  },
  database: function database(databaseName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }

    var _connection$promisify13 = this._connection.promisify(cb);

    var promise = _connection$promisify13.promise;
    var callback = _connection$promisify13.callback;

    var self = this;
    self._connection.request({
      method: 'get',
      path: '/_db/' + databaseName + '/_api/database/current',
      absolutePath: true
    }, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1228) callback(err);else {
          self.createDatabase(databaseName, function (err, database) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);else self.database(databaseName, callback);
            } else callback(null, database);
          });
        }
      } else {
        callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
      }
    });
    return promise;
  },
  databases: function databases(cb) {
    var _connection$promisify14 = this._connection.promisify(cb);

    var promise = _connection$promisify14.promise;
    var callback = _connection$promisify14.callback;

    var self = this;
    self._api.get('database', function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.result.map(function (databaseName) {
          return new Database(extend({}, self._connection.config, { databaseName: databaseName }));
        }));
      }
    });
    return promise;
  },
  dropDatabase: function dropDatabase(databaseName, cb) {
    var _connection$promisify15 = this._connection.promisify(cb);

    var promise = _connection$promisify15.promise;
    var callback = _connection$promisify15.callback;

    var self = this;
    self._api['delete']('database/' + databaseName, function (err, res) {
      if (err) callback(err);else callback(null);
    });
    return promise;
  },
  truncate: function truncate(cb) {
    var _connection$promisify16 = this._connection.promisify(cb);

    var promise = _connection$promisify16.promise;
    var callback = _connection$promisify16.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, res) {
      if (err) callback(err);else {
        all(res.body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, res) {
              if (err) cb(err);else cb(null, res.body);
            });
          };
        }), callback);
      }
    });
    return promise;
  },
  truncateAll: function truncateAll(cb) {
    var _connection$promisify17 = this._connection.promisify(cb);

    var promise = _connection$promisify17.promise;
    var callback = _connection$promisify17.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, res) {
      if (err) callback(err);else {
        all(res.body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, res) {
              if (err) cb(err);else cb(null, res.body);
            });
          };
        }), callback);
      }
    });
    return promise;
  },
  transaction: function transaction(collections, action, params, lockTimeout, cb) {
    if (typeof lockTimeout === 'function') {
      cb = lockTimeout;
      lockTimeout = undefined;
    }
    if (typeof params === 'function') {
      cb = params;
      params = undefined;
    }
    if (typeof params === 'number') {
      lockTimeout = params;
      params = undefined;
    }
    if (typeof collections === 'string' || Array.isArray(collections)) {
      collections = { write: collections };
    }

    var _connection$promisify18 = this._connection.promisify(cb);

    var promise = _connection$promisify18.promise;
    var callback = _connection$promisify18.callback;

    this._api.post('transaction', {
      collections: collections,
      action: action,
      params: params,
      lockTimeout: lockTimeout
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.result);
    });
    return promise;
  },
  query: function query(_query, bindVars, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof bindVars === 'function') {
      cb = bindVars;
      bindVars = undefined;
    }

    var _connection$promisify19 = this._connection.promisify(cb);

    var promise = _connection$promisify19.promise;
    var callback = _connection$promisify19.callback;

    if (_query && typeof _query.toAQL === 'function') {
      _query = _query.toAQL();
    }
    var self = this;
    opts = extend({}, opts, { query: _query, bindVars: bindVars });
    self._api.post('cursor', opts, function (err, res) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  },
  functions: function functions(cb) {
    var _connection$promisify20 = this._connection.promisify(cb);

    var promise = _connection$promisify20.promise;
    var callback = _connection$promisify20.callback;

    this._api.get('aqlfunction', function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createFunction: function createFunction(name, code, cb) {
    var _connection$promisify21 = this._connection.promisify(cb);

    var promise = _connection$promisify21.promise;
    var callback = _connection$promisify21.callback;

    this._api.post('aqlfunction', {
      name: name,
      code: code
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  dropFunction: function dropFunction(name, group, cb) {
    if (typeof group === 'function') {
      cb = group;
      group = undefined;
    }

    var _connection$promisify22 = this._connection.promisify(cb);

    var promise = _connection$promisify22.promise;
    var callback = _connection$promisify22.callback;

    this._api['delete']('aqlfunction/' + name, {
      group: Boolean(group)
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  }
});