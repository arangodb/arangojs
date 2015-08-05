'use strict';
import extend from 'extend';
import Connection from './connection';
import ArrayCursor from './cursor';
import ArangoError from './error';
import _createCollection, {types} from './collection';
import Graph from './graph';
import all from './util/all';

export default class Database {
  constructor(config) {
    this._connection = new Connection(config);
    this._api = this._connection.route('_api');
    this.name = this._connection.config.databaseName;
  }

  route(path, headers) {
    return this._connection.route(path, headers);
  }

  createCollection(properties, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    if (typeof properties === 'string') {
      properties = {name: properties};
    }
    var self = this;
    self._api.post('collection', extend({
      type: types.DOCUMENT_COLLECTION
    }, properties), function (err, res) {
      if (err) callback(err);
      else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  }

  createEdgeCollection(properties, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    if (typeof properties === 'string') {
      properties = {name: properties};
    }
    var self = this;
    self._api.post('collection', extend({
    }, properties, {type: types.EDGE_COLLECTION}), function (err, res) {
      if (err) callback(err);
      else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  }

  collection(collectionName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);
        else {
          self.createCollection({name: collectionName}, function (err, collection) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);
              else self.collection(collectionName, callback);
            }
            else callback(null, collection);
          });
        }
      }
      else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  }

  edgeCollection(collectionName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);
        else {
          self.createEdgeCollection({name: collectionName}, function (err, collection) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);
              else self.edgeCollection(collectionName, callback);
            }
            else callback(null, collection);
          });
        }
      }
      else if (res.body.type !== types.EDGE_COLLECTION) {
        callback(new ArangoError({
          code: 400,
          errorNum: 1237,
          errorMessage: 'wrong collection type'
        }));
      }
      else callback(null, _createCollection(self._connection, res.body));
    });
    return promise;
  }

  collections(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, res) {
      if (err) callback(err);
      else {
        callback(null, res.body.collections.map(function (data) {
          return _createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  }

  allCollections(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, res) {
      if (err) callback(err);
      else {
        callback(null, res.body.collections.map(function (data) {
          return _createCollection(self._connection, data);
        }));
      }
    });
    return promise;
  }

  dropCollection(collectionName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.delete('collection/' + collectionName, function (err, res) {
      if (err) callback(err);
      else callback(null);
    });
    return promise;
  }

  createGraph(properties, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.post('gharial', properties, function (err, res) {
      if (err) callback(err);
      else callback(null, new Graph(self._connection, res.body.graph));
    });
    return promise;
  }

  graph(graphName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('gharial/' + graphName, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1924) callback(err);
        else {
          self.createGraph({name: graphName}, function (err, graph) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1925) callback(err);
              else self.graph(graphName, callback);
            }
            else callback(null, graph);
          });
        }
      }
      else callback(null, new Graph(self._connection, res.body.graph));
    });
    return promise;
  }

  graphs(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('gharial', function (err, res) {
      if (err) callback(err);
      else {
        callback(null, res.body.graphs.map(function (graph) {
          return new Graph(self._connection, graph);
        }));
      }
    });
    return promise;
  }

  dropGraph(graphName, dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.delete('graph/' + graphName, {dropCollections: dropCollections}, callback);
    return promise;
  }

  createDatabase(databaseName, users, cb) {
    if (typeof users === 'function') {
      cb = users;
      users = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.post('database', {
      name: databaseName,
      users: users
    }, function (err, res) {
      if (err) callback(err);
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        )));
      }
    });
    return promise;
  }

  database(databaseName, autoCreate, cb) {
    if (typeof autoCreate === 'function') {
      cb = autoCreate;
      autoCreate = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._connection.request({
      method: 'get',
      path: '/_db/' + databaseName + '/_api/database/current',
      absolutePath: true
    }, function (err, res) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1228) callback(err);
        else {
          self.createDatabase(databaseName, function (err, database) {
            if (err) {
              if (err.name !== 'ArangoError' || err.errorNum !== 1207) callback(err);
              else self.database(databaseName, callback);
            }
            else callback(null, database);
          });
        }
      }
      else {
        callback(null, new Database(extend(
          {}, self._connection.config, {databaseName: databaseName}
        )));
      }
    });
    return promise;
  }

  databases(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('database', function (err, res) {
      if (err) callback(err);
      else {
        callback(null, res.body.result.map(function (databaseName) {
          return new Database(extend(
            {}, self._connection.config, {databaseName: databaseName}
          ));
        }));
      }
    });
    return promise;
  }

  dropDatabase(databaseName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.delete('database/' + databaseName, function (err, res) {
      if (err) callback(err);
      else callback(null);
    });
    return promise;
  }

  truncate(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, res) {
      if (err) callback(err);
      else {
        all(res.body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, res) {
              if (err) cb(err);
              else cb(null, res.body);
            });
          };
        }), callback);
      }
    });
    return promise;
  }

  truncateAll(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, res) {
      if (err) callback(err);
      else {
        all(res.body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, res) {
              if (err) cb(err);
              else cb(null, res.body);
            });
          };
        }), callback);
      }
    });
    return promise;
  }

  transaction(collections, action, params, lockTimeout, cb) {
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
      collections = {write: collections};
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('transaction', {
      collections: collections,
      action: action,
      params: params,
      lockTimeout: lockTimeout
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }

  query(query, bindVars, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof bindVars === 'function') {
      cb = bindVars;
      bindVars = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    opts = extend({}, opts, {query: query, bindVars: bindVars});
    self._api.post('cursor', opts, function (err, res) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  }

  functions(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('aqlfunction', function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  createFunction(name, code, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('aqlfunction', {
      name: name,
      code: code
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  dropFunction(name, group, cb) {
    if (typeof group === 'function') {
      cb = group;
      group = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.delete('aqlfunction/' + name, {
      group: Boolean(group)
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
}
