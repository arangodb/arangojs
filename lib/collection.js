/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  inherits = require('util').inherits,
  extend = require('extend');

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
  this._api = this._connection.endpoint('_api');
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
    self._api.get('collection/' + self.name + '/' + path, function (err, body) {
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
    self._api.put('collection/' + self.name + '/' + path, data, function (err, body) {
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
    self._api.delete('collection/' + self.name, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  replace: function (documentHandle, data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._api.put(this._documentPath(documentHandle), data, opts, function (err, body) {
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
    this._api.patch(this._documentPath(documentHandle), data, opts, function (err, body) {
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
    this._api.delete(this._documentPath(documentHandle), opts, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  all: function (type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = undefined;
    }
    if (!callback) callback = noop;
    this._api.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.documents);
    });
  },
  import: function (data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    this._api.post('import', data, extend({}, opts, {
      collection: this.name
    }), function (err, body) {
      if (err) callback(err);
      else callback(null, body);
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
    this._api.get('document/' + documentHandle, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, callback) {
    if (!callback) callback = noop;
    this._api.post('document/', data, {
      collection: this.name
    }, function (err, body) {
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
    this._api.get('edge/' + documentHandle, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, fromId, toId, callback) {
    if (!callback) callback = noop;
    this._api.post('edge/', data, {
      collection: this.name,
      from: fromId,
      to: toId
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  _edges: function (vertex, direction, callback) {
    if (!callback) callback = noop;
    this._api.get('edges/' + this.name, {
      vertex: vertex,
      direction: direction
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body.edges);
    });
  },
  edges: function (vertex, callback) {
    return this._edges(vertex, undefined, callback);
  },
  inEdges: function (vertex, callback) {
    return this._edges(vertex, 'in', callback);
  },
  outEdges: function (vertex, callback) {
    return this._edges(vertex, 'out', callback);
  }
});

