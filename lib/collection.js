/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  inherits = require('util').inherits,
  extend = require('extend'),
  ArangoError = require('./error');

module.exports = extend(
  function (connection, body) {
    var Ctor = (body.type === 3 ? EdgeCollection : DocumentCollection);
    return new Ctor(connection, body);
  }, {
    _BaseCollection: BaseCollection,
    DocumentCollection: DocumentCollection,
    EdgeCollection: EdgeCollection
  }
);

function BaseCollection(connection, body) {
  this._connection = connection;
  extend(this, body);
  delete this.code;
  delete this.error;
}

extend(BaseCollection.prototype, {
  _documentPath: function (documentHandle) {
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    return (this.type === 3 ? 'edge/' : 'document/') + documentHandle;
  },
  _get: function (path, update, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
      if (err) callback(err);
      else {
        if (update) {
          extend(self, body);
          delete self.code;
          delete self.error;
        }
        callback(null, body);
      }
    });
  },
  _put: function (path, data, update, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.put('collection/' + self.name + '/' + path, data, function (err, body) {
      if (err) callback(err);
      else {
        if (update) extend(self, body);
        callback(null, body);
      }
    });
  },
  properties: function (callback) {
    return this._get('properties', true, callback);
  },
  count: function (callback) {
    return this._get('count', true, callback);
  },
  figures: function (callback) {
    return this._get('figures', true, callback);
  },
  revision: function (callback) {
    return this._get('revision', true, callback);
  },
  checksum: function (opts, callback) {
    return this._get('checksum', true, opts, callback);
  },
  load: function (count, callback) {
    if (typeof count === 'function') {
      callback = count;
      count = undefined;
    }
    return this._put('load', (
      typeof count === 'boolean' ? {count: count} : undefined
    ), true, callback);
  },
  unload: function (callback) {
    return this._put('unload', undefined, true, callback);
  },
  setProperties: function (properties, callback) {
    return this._put('properties', properties, true, callback);
  },
  rename: function (name, callback) {
    return this._put('rename', {name: name}, true, callback);
  },
  rotate: function (callback) {
    return this._put('rotate', undefined, false, callback);
  },
  truncate: function (callback) {
    return this._put('truncate', undefined, true, callback);
  },
  drop: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.delete('collection/' + self.name, function (err, body) {
      if (err) callback(err);
      else callback(null);
    });
  },
  replace: function (documentHandle, data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._connection.put(this._documentPath(documentHandle), data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  update: function (documentHandle, data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._connection.patch(this._documentPath(documentHandle), data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  remove: function (documentHandle, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._connection.delete(this._documentPath(documentHandle), opts, function (err, body) {
      if (err) callback(err);
      else callback(null);
    });
  },
  all: function (type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = undefined;
    }
    if (!callback) callback = noop;
    this._connection.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.documents);
    });
  }
});

function DocumentCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(DocumentCollection, BaseCollection);

extend(DocumentCollection.prototype, {
  document: function (documentHandle, callback) {
    if (!callback) callback = noop;
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.get('document/' + documentHandle, function (err, body) {
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
    this._connection.post('document/', data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  }
});

function EdgeCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function (documentHandle, callback) {
    if (!callback) callback = noop;
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.get('edge/' + documentHandle, function (err, body) {
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
    this._connection.post('edge/', data, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  _edges: function (vertex, direction, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {vertex: vertex, direction: direction});
    this._connection.get('edges/' + this.name, opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body.edges);
    });
  },
  edges: function (vertex, opts, callback) {
    return this._edges(vertex, 'any', opts, callback);
  },
  inEdges: function (vertex, opts, callback) {
    return this._edges(vertex, 'in', opts, callback);
  },
  outEdges: function (vertex, opts, callback) {
    return this._edges(vertex, 'out', opts, callback);
  }
});

