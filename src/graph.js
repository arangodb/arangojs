'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');
var inherits = require('util').inherits;
var BaseCollection = require('./collection')._BaseCollection;

module.exports = Graph;

function Graph(connection, body) {
  this._connection = connection;
  this._api = this._connection.route('_api');
  extend(this, body);
  this._gharial = this._api.route('gharial/' + this.name);
}

Graph.VertexCollection = VertexCollection;
Graph.EdgeCollection = EdgeCollection;

extend(Graph.prototype, {
  drop: function (dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._gharial.delete({
      dropCollections: dropCollections
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  vertexCollection: function (collectionName, cb) {
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);
      else callback(null, new VertexCollection(self._connection, res.body, self));
    });
    return promise;
  },
  addVertexCollection: function (collectionName, cb) {
    var {promise, callback} = promisify(cb);
    this._gharial.post('vertex', {collection: collectionName}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  removeVertexCollection: function (collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._gharial.delete('vertex/' + collectionName, {dropCollection: dropCollection}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  edgeCollection: function (collectionName, cb) {
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);
      else callback(null, new EdgeCollection(self._connection, res.body, self));
    });
    return promise;
  },
  addEdgeDefinition: function (definition, cb) {
    var {promise, callback} = promisify(cb);
    this._gharial.post('edge', definition, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  replaceEdgeDefinition: function (definitionName, definition, cb) {
    var {promise, callback} = promisify(cb);
    this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  removeEdgeDefinition: function (definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._gharial.delete('edge/' + definitionName, {dropCollection: dropCollection}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  traversal: function (startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }
});

function VertexCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.route('gharial/' + this.graph.name + '/vertex/' + this.name);
}
inherits(VertexCollection, BaseCollection);

extend(VertexCollection.prototype, {
  vertex: function (documentHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save: function (data, cb) {
    var {promise, callback} = promisify(cb);
    this._gharial.post(data, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
});

function EdgeCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.route('gharial/' + this.graph.name + '/edge/' + this.name);
}
inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function (documentHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save: function (data, fromId, toId, cb) {
    if (typeof fromId === 'function') {
      cb = fromId;
      fromId = undefined;
    } else {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId);
    }
    var {promise, callback} = promisify(cb);
    this._gharial.post(data, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
});
