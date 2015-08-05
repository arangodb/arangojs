'use strict';
import extend from 'extend';
import Connection from './connection';
import ArrayCursor from './cursor';
import createCollection, {DocumentCollection, EdgeCollection} from './collection';
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

  // Database manipulation

  useDatabase(databaseName) {
    this._connection.config.databaseName = databaseName;
    this.name = databaseName;
  }

  get(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('database/current', (err, res) => {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
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
    }, (err, res) => {
      if (err) callback(err);
      else callback(null);
    });
    return promise;
  }

  listDatabases(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('database', (err, res) => {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }

  listUserDatabases(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('database/user', (err, res) => {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }

  dropDatabase(databaseName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.delete('database/' + databaseName, (err, res) => {
      if (err) callback(err);
      else callback(null);
    });
    return promise;
  }

  // Collection manipulation

  collection(collectionName) {
    return new DocumentCollection(this._connection, collectionName);
  }

  edgeCollection(collectionName) {
    return new EdgeCollection(this._connection, collectionName);
  }

  listCollections(excludeSystem, cb) {
    if (typeof excludeSystem === 'function') {
      cb = excludeSystem;
      excludeSystem = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    if (typeof excludeSystem !== 'boolean') excludeSystem = true;
    this._api.get('collection', {excludeSystem: excludeSystem}, (err, res) => {
      if (err) callback(err);
      else callback(null, res.body.collections);
    });
    return promise;
  }

  collections(excludeSystem, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this.listCollections(excludeSystem, (err, collections) => {
      if (err) callback(err);
      else callback(collections.map(info => createCollection(this._connection, info)));
    });
    return promise;
  }

  truncate(excludeSystem, cb) {
    if (typeof excludeSystem === 'function') {
      cb = excludeSystem;
      excludeSystem = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    this.listCollections(excludeSystem, function (err, collections) {
      if (err) callback(err);
      else {
        all(collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', (err, res) => {
              if (err) cb(err);
              else cb(null);
            });
          };
        }), callback);
      }
    });
    return promise;
  }

  // Graph manipulation

  graph(graphName) {
    return new Graph(this._connection, graphName);
  }

  listGraphs(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('gharial', (err, res) => {
      if (err) callback(err);
      else callback(res.body.graphs);
    });
    return promise;
  }

  graphs(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this.listGraphs((err, graphs) => {
      if (err) callback(err);
      else callback(graphs.map(info => this.graph(info._key)));
    });
    return promise;
  }

  // Queries

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
    }, (err, res) => {
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
    self._api.post('cursor', opts, (err, res) => {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  }

  // Function manipulation

  listFunctions(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('aqlfunction', (err, res) => {
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
    }, (err, res) => {
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
    }, (err, res) => {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
}
