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

    // Database manipulation

  }, {
    key: 'useDatabase',
    value: function useDatabase(databaseName) {
      this._connection.config.databaseName = databaseName;
      this.name = databaseName;
    }
  }, {
    key: 'get',
    value: function get(cb) {
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._api.get('database/current', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'createDatabase',
    value: function createDatabase(databaseName, users, cb) {
      if (typeof users === 'function') {
        cb = users;
        users = undefined;
      }

      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._api.post('database', { users: users, name: databaseName }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'listDatabases',
    value: function listDatabases(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._api.get('database', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'listUserDatabases',
    value: function listUserDatabases(cb) {
      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._api.get('database/user', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'dropDatabase',
    value: function dropDatabase(databaseName, cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._api['delete']('database/' + databaseName, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }

    // Collection manipulation

  }, {
    key: 'collection',
    value: function collection(collectionName) {
      return new _collection.DocumentCollection(this._connection, collectionName);
    }
  }, {
    key: 'edgeCollection',
    value: function edgeCollection(collectionName) {
      return new _collection.EdgeCollection(this._connection, collectionName);
    }
  }, {
    key: 'listCollections',
    value: function listCollections(excludeSystem, cb) {
      if (typeof excludeSystem === 'function') {
        cb = excludeSystem;
        excludeSystem = undefined;
      }

      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      if (typeof excludeSystem !== 'boolean') excludeSystem = true;
      this._api.get('collection', { excludeSystem: excludeSystem }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.collections);
      });
      return promise;
    }
  }, {
    key: 'collections',
    value: function collections(excludeSystem, cb) {
      var _this = this;

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this.listCollections(excludeSystem, function (err, collections) {
        return err ? callback(err) : callback(collections.map(function (info) {
          return (0, _collection2['default'])(_this._connection, info);
        }));
      });
      return promise;
    }
  }, {
    key: 'truncate',
    value: function truncate(excludeSystem, cb) {
      var _this2 = this;

      if (typeof excludeSystem === 'function') {
        cb = excludeSystem;
        excludeSystem = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      this.listCollections(excludeSystem, function (err, collections) {
        return err ? callback(err) : (0, _utilAll2['default'])(collections.map(function (data) {
          return function (cb) {
            return _this2._api.put('collection/' + data.name + '/truncate', function (err, res) {
              return err ? cb(err) : cb(null, res.body);
            });
          };
        }), callback);
      });
      return promise;
    }

    // Graph manipulation

  }, {
    key: 'graph',
    value: function graph(graphName) {
      return new _graph2['default'](this._connection, graphName);
    }
  }, {
    key: 'listGraphs',
    value: function listGraphs(cb) {
      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._api.get('gharial', function (err, res) {
        return err ? callback(err) : callback(res.body.graphs);
      });
      return promise;
    }
  }, {
    key: 'graphs',
    value: function graphs(cb) {
      var _this3 = this;

      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this.listGraphs(function (err, graphs) {
        return err ? callback(err) : callback(graphs.map(function (info) {
          return _this3.graph(info._key);
        }));
      });
      return promise;
    }

    // Queries

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

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      this._api.post('transaction', { collections: collections, action: action, params: params, lockTimeout: lockTimeout }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'query',
    value: function query(_query, bindVars, opts, cb) {
      var _this4 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof bindVars === 'function') {
        cb = bindVars;
        bindVars = undefined;
      }

      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      if (_query && typeof _query.toAQL === 'function') {
        _query = _query.toAQL();
      }
      this._api.post('cursor', (0, _extend2['default'])({}, opts, { query: _query, bindVars: bindVars }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this4._connection, res.body));
      });
      return promise;
    }

    // Function manipulation

  }, {
    key: 'listFunctions',
    value: function listFunctions(cb) {
      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.get('aqlfunction', function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createFunction',
    value: function createFunction(name, code, cb) {
      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      this._api.post('aqlfunction', { name: name, code: code }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
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

      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api['delete']('aqlfunction/' + name, { group: Boolean(group) }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return Database;
})();

exports['default'] = Database;
module.exports = exports['default'];