'use strict';
import extend from 'extend';
import {_BaseCollection as BaseCollection} from './collection';

class VertexCollection extends BaseCollection {
  constructor(connection, body, graph) {
    super(connection, body);
    this.graph = graph;
    BaseCollection.call(this, connection, body);
    this._gharial = this._api.route('gharial/' + this.graph.name + '/vertex/' + this.name);
  }

  vertex(documentHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  save(data, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(data, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
}

class EdgeCollection extends BaseCollection {
  constructor(connection, body, graph) {
    super(connection, body);
    this.graph = graph;
    BaseCollection.call(this, connection, body);
    this._gharial = this._api.route('gharial/' + this.graph.name + '/edge/' + this.name);
  }

  edge(documentHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
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
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.post(data, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
}

export default class Graph {
  static VertexCollection = VertexCollection;
  static EdgeCollection = EdgeCollection;

  constructor(connection, body) {
    this._connection = connection;
    this._api = this._connection.route('_api');
    extend(this, body);
    this._gharial = this._api.route('gharial/' + this.name);
  }

  drop(dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete({
      dropCollections: dropCollections
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  vertexCollection(collectionName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);
      else callback(null, new VertexCollection(self._connection, res.body, self));
    });
    return promise;
  }

  addVertexCollection(collectionName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.post('vertex', {collection: collectionName}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  removeVertexCollection(collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete('vertex/' + collectionName, {dropCollection: dropCollection}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  edgeCollection(collectionName, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);
      else callback(null, new EdgeCollection(self._connection, res.body, self));
    });
    return promise;
  }

  addEdgeDefinition(definition, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.post('edge', definition, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  replaceEdgeDefinition(definitionName, definition, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  removeEdgeDefinition(definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._gharial.delete('edge/' + definitionName, {dropCollection: dropCollection}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }

  traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }
}
