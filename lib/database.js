'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _connection = require('./connection');

var _connection2 = _interopRequireDefault(_connection);

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _collection = require('./collection');

var _collection2 = _interopRequireDefault(_collection);

var _graph = require('./graph');

var _graph2 = _interopRequireDefault(_graph);

var _utilAll = require('./util/all');

var _utilAll2 = _interopRequireDefault(_utilAll);

var Database = (function () {
  function Database(config) {
    _classCallCheck(this, Database);

    this._connection = new _connection2['default'](config);
    this._api = this._connection.route('_api');
    this.name = this._connection.config.databaseName;
  }

  _createClass(Database, [{
    key: 'route',
    value: function route(path, headers) {
      return this._connection.route(path, headers);
    }
  }, {
    key: 'createCollection',
    value: function createCollection(properties, cb) {
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      if (typeof properties === 'string') {
        properties = { name: properties };
      }
      var self = this;
      self._api.post('collection', (0, _extend2['default'])({
        type: _collection.types.DOCUMENT_COLLECTION
      }, properties), function (err, res) {
        if (err) callback(err);else callback(null, (0, _collection2['default'])(self._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'createEdgeCollection',
    value: function createEdgeCollection(properties, cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      if (typeof properties === 'string') {
        properties = { name: properties };
      }
      var self = this;
      self._api.post('collection', (0, _extend2['default'])({}, properties, { type: _collection.types.EDGE_COLLECTION }), function (err, res) {
        if (err) callback(err);else callback(null, (0, _collection2['default'])(self._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'collection',
    value: function collection(collectionName, autoCreate, cb) {
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
        } else callback(null, (0, _collection2['default'])(self._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'edgeCollection',
    value: function edgeCollection(collectionName, autoCreate, cb) {
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
        } else if (res.body.type !== _collection.types.EDGE_COLLECTION) {
          callback(new _error2['default']({
            code: 400,
            errorNum: 1237,
            errorMessage: 'wrong collection type'
          }));
        } else callback(null, (0, _collection2['default'])(self._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'collections',
    value: function collections(cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      var self = this;
      self._api.get('collection', {
        excludeSystem: true
      }, function (err, res) {
        if (err) callback(err);else {
          callback(null, res.body.collections.map(function (data) {
            return (0, _collection2['default'])(self._connection, data);
          }));
        }
      });
      return promise;
    }
  }, {
    key: 'allCollections',
    value: function allCollections(cb) {
      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      var self = this;
      self._api.get('collection', {
        excludeSystem: false
      }, function (err, res) {
        if (err) callback(err);else {
          callback(null, res.body.collections.map(function (data) {
            return (0, _collection2['default'])(self._connection, data);
          }));
        }
      });
      return promise;
    }
  }, {
    key: 'dropCollection',
    value: function dropCollection(collectionName, cb) {
      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      var self = this;
      self._api['delete']('collection/' + collectionName, function (err, res) {
        if (err) callback(err);else callback(null);
      });
      return promise;
    }
  }, {
    key: 'createGraph',
    value: function createGraph(properties, cb) {
      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      var self = this;
      self._api.post('gharial', properties, function (err, res) {
        if (err) callback(err);else callback(null, new _graph2['default'](self._connection, res.body.graph));
      });
      return promise;
    }
  }, {
    key: 'graph',
    value: function graph(graphName, autoCreate, cb) {
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
        } else callback(null, new _graph2['default'](self._connection, res.body.graph));
      });
      return promise;
    }
  }, {
    key: 'graphs',
    value: function graphs(cb) {
      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      var self = this;
      self._api.get('gharial', function (err, res) {
        if (err) callback(err);else {
          callback(null, res.body.graphs.map(function (graph) {
            return new _graph2['default'](self._connection, graph);
          }));
        }
      });
      return promise;
    }
  }, {
    key: 'dropGraph',
    value: function dropGraph(graphName, dropCollections, cb) {
      if (typeof dropCollections === 'function') {
        cb = dropCollections;
        dropCollections = undefined;
      }

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      this._api['delete']('graph/' + graphName, { dropCollections: dropCollections }, callback);
      return promise;
    }
  }, {
    key: 'createDatabase',
    value: function createDatabase(databaseName, users, cb) {
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
          callback(null, new Database((0, _extend2['default'])({}, self._connection.config, { databaseName: databaseName })));
        }
      });
      return promise;
    }
  }, {
    key: 'database',
    value: function database(databaseName, autoCreate, cb) {
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
          callback(null, new Database((0, _extend2['default'])({}, self._connection.config, { databaseName: databaseName })));
        }
      });
      return promise;
    }
  }, {
    key: 'databases',
    value: function databases(cb) {
      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      var self = this;
      self._api.get('database', function (err, res) {
        if (err) callback(err);else {
          callback(null, res.body.result.map(function (databaseName) {
            return new Database((0, _extend2['default'])({}, self._connection.config, { databaseName: databaseName }));
          }));
        }
      });
      return promise;
    }
  }, {
    key: 'dropDatabase',
    value: function dropDatabase(databaseName, cb) {
      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      var self = this;
      self._api['delete']('database/' + databaseName, function (err, res) {
        if (err) callback(err);else callback(null);
      });
      return promise;
    }
  }, {
    key: 'truncate',
    value: function truncate(cb) {
      var _connection$promisify16 = this._connection.promisify(cb);

      var promise = _connection$promisify16.promise;
      var callback = _connection$promisify16.callback;

      var self = this;
      self._api.get('collection', {
        excludeSystem: true
      }, function (err, res) {
        if (err) callback(err);else {
          (0, _utilAll2['default'])(res.body.collections.map(function (data) {
            return function (cb) {
              self._api.put('collection/' + data.name + '/truncate', function (err, res) {
                if (err) cb(err);else cb(null, res.body);
              });
            };
          }), callback);
        }
      });
      return promise;
    }
  }, {
    key: 'truncateAll',
    value: function truncateAll(cb) {
      var _connection$promisify17 = this._connection.promisify(cb);

      var promise = _connection$promisify17.promise;
      var callback = _connection$promisify17.callback;

      var self = this;
      self._api.get('collection', {
        excludeSystem: false
      }, function (err, res) {
        if (err) callback(err);else {
          (0, _utilAll2['default'])(res.body.collections.map(function (data) {
            return function (cb) {
              self._api.put('collection/' + data.name + '/truncate', function (err, res) {
                if (err) cb(err);else cb(null, res.body);
              });
            };
          }), callback);
        }
      });
      return promise;
    }
  }, {
    key: 'transaction',
    value: function transaction(collections, action, params, lockTimeout, cb) {
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
    }
  }, {
    key: 'query',
    value: function query(_query, bindVars, opts, cb) {
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
      opts = (0, _extend2['default'])({}, opts, { query: _query, bindVars: bindVars });
      self._api.post('cursor', opts, function (err, res) {
        if (err) callback(err);else callback(null, new _cursor2['default'](self._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'functions',
    value: function functions(cb) {
      var _connection$promisify20 = this._connection.promisify(cb);

      var promise = _connection$promisify20.promise;
      var callback = _connection$promisify20.callback;

      this._api.get('aqlfunction', function (err, res) {
        if (err) callback(err);else callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createFunction',
    value: function createFunction(name, code, cb) {
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
    }
  }, {
    key: 'dropFunction',
    value: function dropFunction(name, group, cb) {
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
  }]);

  return Database;
})();

exports['default'] = Database;
module.exports = exports['default'];