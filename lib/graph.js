'use strict';
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

    var _connection$promisify = this._connection.promisify(cb);

    var promise = _connection$promisify.promise;
    var callback = _connection$promisify.callback;

    this._gharial['delete']({
      dropCollections: dropCollections
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  vertexCollection: function vertexCollection(collectionName, cb) {
    var _connection$promisify2 = this._connection.promisify(cb);

    var promise = _connection$promisify2.promise;
    var callback = _connection$promisify2.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);else callback(null, new VertexCollection(self._connection, res.body, self));
    });
    return promise;
  },
  addVertexCollection: function addVertexCollection(collectionName, cb) {
    var _connection$promisify3 = this._connection.promisify(cb);

    var promise = _connection$promisify3.promise;
    var callback = _connection$promisify3.callback;

    this._gharial.post('vertex', { collection: collectionName }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  removeVertexCollection: function removeVertexCollection(collectionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }

    var _connection$promisify4 = this._connection.promisify(cb);

    var promise = _connection$promisify4.promise;
    var callback = _connection$promisify4.callback;

    this._gharial['delete']('vertex/' + collectionName, { dropCollection: dropCollection }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  edgeCollection: function edgeCollection(collectionName, cb) {
    var _connection$promisify5 = this._connection.promisify(cb);

    var promise = _connection$promisify5.promise;
    var callback = _connection$promisify5.callback;

    var self = this;
    self._api.get('collection/' + collectionName, function (err, res) {
      if (err) callback(err);else callback(null, new EdgeCollection(self._connection, res.body, self));
    });
    return promise;
  },
  addEdgeDefinition: function addEdgeDefinition(definition, cb) {
    var _connection$promisify6 = this._connection.promisify(cb);

    var promise = _connection$promisify6.promise;
    var callback = _connection$promisify6.callback;

    this._gharial.post('edge', definition, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  replaceEdgeDefinition: function replaceEdgeDefinition(definitionName, definition, cb) {
    var _connection$promisify7 = this._connection.promisify(cb);

    var promise = _connection$promisify7.promise;
    var callback = _connection$promisify7.callback;

    this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  removeEdgeDefinition: function removeEdgeDefinition(definitionName, dropCollection, cb) {
    if (typeof dropCollection === 'function') {
      cb = dropCollection;
      dropCollection = undefined;
    }

    var _connection$promisify8 = this._connection.promisify(cb);

    var promise = _connection$promisify8.promise;
    var callback = _connection$promisify8.callback;

    this._gharial['delete']('edge/' + definitionName, { dropCollection: dropCollection }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  traversal: function traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify9 = this._connection.promisify(cb);

    var promise = _connection$promisify9.promise;
    var callback = _connection$promisify9.callback;

    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, res) {
      if (err) callback(err);else callback(null, res.body.result);
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
    var _connection$promisify10 = this._connection.promisify(cb);

    var promise = _connection$promisify10.promise;
    var callback = _connection$promisify10.callback;

    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  save: function save(data, cb) {
    var _connection$promisify11 = this._connection.promisify(cb);

    var promise = _connection$promisify11.promise;
    var callback = _connection$promisify11.callback;

    this._gharial.post(data, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
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
    var _connection$promisify12 = this._connection.promisify(cb);

    var promise = _connection$promisify12.promise;
    var callback = _connection$promisify12.callback;

    this._gharial.get(documentHandle, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
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

    var _connection$promisify13 = this._connection.promisify(cb);

    var promise = _connection$promisify13.promise;
    var callback = _connection$promisify13.callback;

    this._gharial.post(data, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  }
});