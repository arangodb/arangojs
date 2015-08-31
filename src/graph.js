'use strict';
import extend from 'extend';
import {_BaseCollection as BaseCollection} from './collection';

class VertexCollection extends BaseCollection {
  constructor(connection, name, graph) {
    super(connection, name);
    this.graph = graph;
    this._gharial = this._api.route(`gharial/${this.graph.name}/vertex/${this.name}`);
  }

  vertex(documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.get(
      documentHandle,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  save(data, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(
      data,
      {collection: this.name},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }
}

class EdgeCollection extends BaseCollection {
  constructor(connection, name, graph) {
    super(connection, name);
    this.graph = graph;
    this._gharial = this._api.route(`gharial/${this.graph.name}/edge/${this.name}`);
  }

  edge(documentHandle, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.get(
      documentHandle,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  save(data, fromId, toId, cb) {
    if (typeof fromId === 'function') {
      cb = fromId;
      fromId = undefined;
    } else {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId);
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(
      data,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }
}

export default class Graph {
  static VertexCollection = VertexCollection;
  static EdgeCollection = EdgeCollection;

  constructor(connection, name) {
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._gharial = this._api.route(`gharial/${this.name}`);
    this.name = name;
  }

  get(cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.get(
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    );
    return promise;
  }

  create(properties, cb) {
    if (typeof properties === 'function') {
      cb = properties;
      properties = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'gharial',
      extend({}, properties, {name: this.name}),
      (err, res) => err ? callback(err) : callback(null, res.body.graph)
    );
    return promise;
  }

  drop(dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete(
      {dropCollections},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  vertexCollection(collectionName, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `collection/${collectionName}`,
      (err, res) => (
        err
        ? callback(err)
        : callback(null, new VertexCollection(this._connection, res.body, this))
      )
    );
    return promise;
  }

  addVertexCollection(collectionName, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(
      'vertex',
      {collection: collectionName},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  removeVertexCollection(collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete(
      `vertex/${collectionName}`,
      {dropCollection},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  edgeCollection(collectionName, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      `collection/${collectionName}`,
      (err, res) => (
        err
        ? callback(err)
        : callback(null, new EdgeCollection(this._connection, res.body, this))
      )
    );
    return promise;
  }

  addEdgeDefinition(definition, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(
      'edge',
      definition,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  replaceEdgeDefinition(definitionName, definition, cb) {
    const {promise, callback} = this._connection.promisify(cb);
    this._api.put(
      `gharial/${this.name}/edge/${definitionName}`,
      definition,
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  removeEdgeDefinition(definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete(
      `edge/${definitionName}`,
      {dropCollection},
      (err, res) => err ? callback(err) : callback(null, res.body)
    );
    return promise;
  }

  traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    const {promise, callback} = this._connection.promisify(cb);
    this._api.post(
      'traversal',
      extend({}, opts, {startVertex, graphName: this.name}),
      (err, res) => err ? callback(err) : callback(null, res.body.result)
    );
    return promise;
  }
}
