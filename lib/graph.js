/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  inherits = require('util').inherits,
  BaseCollection = require('./collection')._BaseCollection;

module.exports = Graph;

function Graph(connection, body) {
  this._connection = connection;
  this._api = this._connection.endpoint('_api');
  this._gharial = this._api.endpoint('gharial/' + this.name);
  extend(this, body);
}

Graph.VertexCollection = VertexCollection;
Graph.EdgeCollection = EdgeCollection;

extend(Graph.prototype, {
  drop: function (dropCollections, callback) {
    if (typeof dropCollections === 'function') {
      callback = dropCollections;
      dropCollections = undefined;
    }
    if (!callback) callback = noop;
    this._gharial.delete({
      dropCollections: dropCollections
    }, callback);
  },
  vertexCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null, new VertexCollection(self._connection, body, self));
    });
  },
  addVertexCollection: function (collectionName, callback) {
    this._gharial.post('vertex', {collection: collectionName}, callback);
  },
  removeVertexCollection: function (collectionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._gharial.delete('vertex/' + collectionName, {dropCollection: dropCollection}, callback);
  },
  edgeCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null, new EdgeCollection(self._connection, body, self));
    });
  },
  addEdgeDefinition: function (definition, callback) {
    this._gharial.post('edge', definition, callback);
  },
  replaceEdgeDefinition: function (definitionName, definition, callback) {
    if (!callback) callback = noop;
    this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, callback);
  },
  removeEdgeDefinition: function (definitionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._gharial.delete('edge/' + definitionName, {dropCollection: dropCollection}, callback);
  },
  traversal: function (startVertex, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, data) {
      if (err) callback(err);
      else callback(null, data.result);
    });
  }
});

function VertexCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.endpoint('gharial/' + this.graph.name + '/vertex/' + this.name);
}
inherits(VertexCollection, BaseCollection);

extend(VertexCollection.prototype, {
  vertex: function (documentHandle, callback) {
    if (!callback) callback = noop;
    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, callback) {
    if (!callback) callback = noop;
    this._gharial.post(data, {
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});

function EdgeCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.endpoint('gharial/' + this.graph.name + '/edge/' + this.name);
}
inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function (documentHandle, callback) {
    if (!callback) callback = noop;
    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, fromId, toId, callback) {
    if (!callback) callback = noop;
    this._gharial.post(data, {
      collection: this.name,
      from: fromId,
      to: toId
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});