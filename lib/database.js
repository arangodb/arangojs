'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');
var Connection = require('./connection');
var ArrayCursor = require('./cursor');
var createCollection = require('./collection');
var Graph = require('./graph');
var all = require('./util/all');

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
  createCollection: (function (_createCollection) {
    function createCollection(_x, _x2) {
      return _createCollection.apply(this, arguments);
    }

    createCollection.toString = function () {
      return _createCollection.toString();
    };

    return createCollection;
  })(function (properties, cb) {
    var _promisify = promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({
      type: 2
    }, properties), function (err, res) {
      if (err) callback(err);else callback(null, createCollection(self._connection, res.body));
    });
    return promise;
  }),
  createEdgeCollection: function createEdgeCollection(properties, cb) {
    var _promisify2 = promisify(cb);

    var promise = _promisify2.promise;
    var callback = _promisify2.callback;

    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({}, properties, { type: 3 }), function (err, res) {
      if (err) callback(err);else callback(null, createCollection(self._connection, res.body));
    });
    return promise;
  },
  collection: function collection(collectionName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }

    var _promisify3 = promisify(cb);

    var promise = _promisify3.promise;
    var callback = _promisify3.callback;

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
      } else callback(null, createCollection(self._connection, res.body));
    });
    return promise;
  },
  collections: function collections(cb) {
    var _promisify4 = promisify(cb);

    var promise = _promisify4.promise;
    var callback = _promisify4.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.collections.map(function (data) {
          return createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  },
  allCollections: function allCollections(cb) {
    var _promisify5 = promisify(cb);

    var promise = _promisify5.promise;
    var callback = _promisify5.callback;

    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, res) {
      if (err) callback(err);else {
        callback(null, res.body.collections.map(function (data) {
          return createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  },
  dropCollection: function dropCollection(collectionName, cb) {
    var _promisify6 = promisify(cb);

    var promise = _promisify6.promise;
    var callback = _promisify6.callback;

    var self = this;
    self._api['delete']('collection/' + collectionName, function (err, res) {
      if (err) callback(err);else callback(null);
    });
    return promise;
  },
  createGraph: function createGraph(properties, cb) {
    var _promisify7 = promisify(cb);

    var promise = _promisify7.promise;
    var callback = _promisify7.callback;

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

    var _promisify8 = promisify(cb);

    var promise = _promisify8.promise;
    var callback = _promisify8.callback;

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
    var _promisify9 = promisify(cb);

    var promise = _promisify9.promise;
    var callback = _promisify9.callback;

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

    var _promisify10 = promisify(cb);

    var promise = _promisify10.promise;
    var callback = _promisify10.callback;

    this._api['delete']('graph/' + graphName, { dropCollections: dropCollections }, callback);
    return promise;
  },
  createDatabase: function createDatabase(databaseName, users, cb) {
    if (typeof users === 'function') {
      cb = users;
      users = undefined;
    }

    var _promisify11 = promisify(cb);

    var promise = _promisify11.promise;
    var callback = _promisify11.callback;

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

    var _promisify12 = promisify(cb);

    var promise = _promisify12.promise;
    var callback = _promisify12.callback;

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
    var _promisify13 = promisify(cb);

    var promise = _promisify13.promise;
    var callback = _promisify13.callback;

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
    var _promisify14 = promisify(cb);

    var promise = _promisify14.promise;
    var callback = _promisify14.callback;

    var self = this;
    self._api['delete']('database/' + databaseName, function (err, res) {
      if (err) callback(err);else callback(null);
    });
    return promise;
  },
  truncate: function truncate(cb) {
    var _promisify15 = promisify(cb);

    var promise = _promisify15.promise;
    var callback = _promisify15.callback;

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
    var _promisify16 = promisify(cb);

    var promise = _promisify16.promise;
    var callback = _promisify16.callback;

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

    var _promisify17 = promisify(cb);

    var promise = _promisify17.promise;
    var callback = _promisify17.callback;

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
  query: (function (_query) {
    function query(_x3, _x4, _x5) {
      return _query.apply(this, arguments);
    }

    query.toString = function () {
      return _query.toString();
    };

    return query;
  })(function (query, bindVars, cb) {
    if (typeof bindVars === 'function') {
      cb = bindVars;
      bindVars = undefined;
    }

    var _promisify18 = promisify(cb);

    var promise = _promisify18.promise;
    var callback = _promisify18.callback;

    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    self._api.post('cursor', {
      query: query,
      bindVars: bindVars
    }, function (err, res) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  }),
  functions: function functions(cb) {
    var _promisify19 = promisify(cb);

    var promise = _promisify19.promise;
    var callback = _promisify19.callback;

    this._api.get('aqlfunction', function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createFunction: function createFunction(name, code, cb) {
    var _promisify20 = promisify(cb);

    var promise = _promisify20.promise;
    var callback = _promisify20.callback;

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

    var _promisify21 = promisify(cb);

    var promise = _promisify21.promise;
    var callback = _promisify21.callback;

    this._api['delete']('aqlfunction/' + name, {
      group: Boolean(group)
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  }
});