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
  drop: function drop(dropCollections, cb) {
    if (typeof dropCollections === 'function') {
      cb = dropCollections;
      dropCollections = undefined;
    }
    return this._gharial['delete']({
      dropCollections: dropCollections
    }, cb);
  },
  vertexCollection: function vertexCollection(collectionName, cb) {
    var _promisify = promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);else callback(null, new VertexCollection(self._connection, body, self));
    });
    return promise;
  },
  addVertexCollection: function addVertexCollection(collectionName, cb) {
    return this._gharial.post('vertex', { collection: collectionName }, cb);
  },
  removeVertexCollection: function removeVertexCollection(collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    return this._gharial['delete']('vertex/' + collectionName, { dropCollection: dropCollection }, cb);
  },
  edgeCollection: function edgeCollection(collectionName, cb) {
    var _promisify2 = promisify(cb);

    var promise = _promisify2.promise;
    var callback = _promisify2.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);else callback(null, new EdgeCollection(self._connection, body, self));
    });
    return promise;
  },
  addEdgeDefinition: function addEdgeDefinition(definition, cb) {
    return this._gharial.post('edge', definition, cb);
  },
  replaceEdgeDefinition: function replaceEdgeDefinition(definitionName, definition, cb) {
    return this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, cb);
  },
  removeEdgeDefinition: function removeEdgeDefinition(definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }
    return this._gharial['delete']('edge/' + definitionName, { dropCollection: dropCollection }, cb);
  },
  traversal: function traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _promisify3 = promisify(cb);

    var promise = _promisify3.promise;
    var callback = _promisify3.callback;

    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, data) {
      if (err) callback(err);else callback(null, data.result);
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
  vertex: function vertex(documentHandle, cb) {
    var _promisify4 = promisify(cb);

    var promise = _promisify4.promise;
    var callback = _promisify4.callback;

    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
    return promise;
  },
  save: function save(data, cb) {
    var _promisify5 = promisify(cb);

    var promise = _promisify5.promise;
    var callback = _promisify5.callback;

    this._gharial.post(data, {
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
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
  edge: function edge(documentHandle, cb) {
    var _promisify6 = promisify(cb);

    var promise = _promisify6.promise;
    var callback = _promisify6.callback;

    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
    return promise;
  },
  save: function save(data, fromId, toId, cb) {
    if (typeof fromId === 'function') {
      cb = fromId;
      fromId = undefined;
    } else {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId);
    }

    var _promisify7 = promisify(cb);

    var promise = _promisify7.promise;
    var callback = _promisify7.callback;

    this._gharial.post(data, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
    return promise;
  }
});