/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  inherits = require('util').inherits,
  BaseCollection = require('./collection')._BaseCollection,
  ArangoError = require('./error');

module.exports = Graph;

function Graph(connection, body) {
  this._connection = connection;
  extend(this, body);
}

Graph._GraphBaseCollection = GraphBaseCollection;
Graph.VertexCollection = VertexCollection;
Graph.EdgeCollection = EdgeCollection;

extend(Graph.prototype, {
  _post: function (path, data, callback) {
    if (!callback) callback = noop;
    this._connection.post('gharial/' + this.name + '/' + path, data, callback);
  },
  _delete: function (path, data, callback) {
    if (!callback) callback = noop;
    this._connection.delete('gharial/' + this.name + '/' + path, data, callback);
  },
  drop: function (dropCollections, callback) {
    if (typeof dropCollections === 'function') {
      callback = dropCollections;
      dropCollections = undefined;
    }
    if (!callback) callback = noop;
    this._connection.delete('gharial/' + this.name, {
      dropCollections: dropCollections
    }, callback);
  },
  vertexCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null, new VertexCollection(self._connection, body, self));
    });
  },
  addVertexCollection: function (collectionName, callback) {
    this._post('vertex', {collection: collectionName}, callback);
  },
  removeVertexCollection: function (collectionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._delete('vertex/' + collectionName, {dropCollection: dropCollection}, callback);
  },
  edgeCollection: function (collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);
      else callback(null, new EdgeCollection(self._connection, body, self));
    });
  },
  addEdgeDefinition: function (definition, callback) {
    this._post('edge', definition, callback);
  },
  replaceEdgeDefinition: function (definitionName, definition, callback) {
    if (!callback) callback = noop;
    this._connection.put('gharial/' + this.name + '/edge/' + definitionName, definition, callback);
  },
  removeEdgeDefinition: function (definitionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._delete('edge/' + definitionName, {dropCollection: dropCollection}, callback);
  }
});

function GraphBaseCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
}
inherits(GraphBaseCollection, BaseCollection);

extend(GraphBaseCollection.prototype, {
  _documentPath: function (documentHandle) {
    var tokens = documentHandle.split('/');
    return this._relativePath(tokens[tokens.length - 1]);
  }
});

function VertexCollection(connection, body, graph) {
  GraphBaseCollection.call(this, connection, body, graph);
}
inherits(VertexCollection, GraphBaseCollection);

extend(VertexCollection.prototype, {
  _relativePath: function (path) {
    return 'gharial/' + this.graph.name + '/vertex/' + this.name + '/' + (path || '');
  },
  vertex: function (documentHandle, callback) {
    if (!callback) callback = noop;
    this._connection.get(this._documentPath(documentHandle), function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._connection.post(this._relativePath(''), data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});

function EdgeCollection(connection, body, graph) {
  GraphBaseCollection.call(this, connection, body, graph);
}
inherits(EdgeCollection, GraphBaseCollection);

extend(EdgeCollection.prototype, {
  _relativePath: function (path) {
    return 'gharial/' + this.graph.name + '/edge/' + this.name + '/' + (path || '');
  },
  edge: function (documentHandle, callback) {
    if (!callback) callback = noop;
    this._connection.get(this._documentPath(documentHandle), function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, fromId, toId, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name, from: fromId, to: toId});
    this._connection.post(this._relativePath(''), data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});