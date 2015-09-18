'use strict';
import extend from 'extend';
import all from './util/all';
import Connection from './connection';
import ArrayCursor from './cursor';
import Graph from './graph';
import constructCollection, {
  DocumentCollection,
  EdgeCollection
} from './collection';

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
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'database/current',
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }

  createDatabase(databaseName, users, cb) {
    if (typeof users === 'function') {
      cb = users;
      users = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'database',
      {users, name: databaseName},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  listDatabases(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'database',
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }

  listUserDatabases(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'database/user',
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }

  dropDatabase(databaseName, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      `database/${databaseName}`,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
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
    const {promise, callback} = this._connection.promisify(cb);
    if (typeof excludeSystem !== 'boolean') excludeSystem = true;
    this._api.get(
      'collection',
      {excludeSystem},
      (err, res) => err ? callback(err) : callback(null, res.body.collections)
    );
    return promise;
  }

  collections(excludeSystem, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this.listCollections(
      excludeSystem,
      (err, collections) => (
        err
        ? callback(err)
        : callback(collections.map(info => constructCollection(this._connection, info)))
      )
    );
    return promise;
  }

  truncate(excludeSystem, cb) {
    if (typeof excludeSystem === 'function') {
      cb = excludeSystem;
      excludeSystem = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this.listCollections(
      excludeSystem,
      (err, collections) => (
        err
        ? callback(err)
        : all(collections.map(data => cb => this._api.put(
            `collection/${data.name}/truncate`,
            (err, res) => err ? cb(err) : cb(null, res.body)
        )), callback)
      )
    );
    return promise;
  }

  // Graph manipulation

  graph(graphName) {
    return new Graph(this._connection, graphName);
  }

  listGraphs(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'gharial',
      (err, res) => err ? callback(err) : callback(null, res.body.graphs)
    );
    return promise;
  }

  graphs(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this.listGraphs(
      (err, graphs) => err ? callback(err) : callback(null, graphs.map(info => this.graph(info._key)))
    );
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
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'transaction',
      {collections, action, params, lockTimeout},
      (err, res) => err ? callback(err) : callback(null, res.body.result)
  );
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
    const {promise, callback} = this._connection.promisify(cb);
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    if (query && query.query) {
      bindVars = query.bindVars;
      query = query.query;
    }
    this._api.post(
      'cursor',
      extend({}, opts, {query, bindVars}),
      (err, res) => err ? callback(err) : callback(null, new ArrayCursor(this._connection, res.body))
    );
    return promise;
  }

  // Function manipulation

  listFunctions(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'aqlfunction',
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  createFunction(name, code, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'aqlfunction',
      {name, code},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  dropFunction(name, group, cb) {
    if (typeof group === 'function') {
      cb = group;
      group = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      `aqlfunction/${name}`,
      {group: Boolean(group)},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }
}
