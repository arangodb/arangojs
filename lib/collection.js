/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  inherits = require('util').inherits,
  extend = require('extend'),
  ArrayCursor = require('./cursor');

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
    return (this.type === 3 ? 'edge/' : 'document/') + this._documentHandle(documentHandle);
  },
  _documentHandle: function (documentHandle) {
    if (documentHandle._id) {
      documentHandle = documentHandle._id;
    } else if (documentHandle._key) {
      documentHandle = documentHandle._key;
    }
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    return documentHandle;
  },
  _indexHandle: function (indexHandle) {
    if (indexHandle.id) {
      indexHandle = indexHandle.id;
    }
    if (indexHandle.indexOf('/') === -1) {
      indexHandle = this.name + '/' + indexHandle;
    }
    return indexHandle;
  },
  _get: function (path, update, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + self.name + '/' + path, opts, function (err, body) {
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
    this._api.request({
      method: 'POST',
      path: 'import',
      body: data,
      ld: Boolean(opts.type !== 'array'),
      qs: extend({}, opts, {collection: this.name})
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  indexes: function (callback) {
    if (!callback) callback = noop;
    this._api.get('index', {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result.indexes);
    });
  },
  index: function (indexHandle, callback) {
    if (!callback) callback = noop;
    this._api.get(
      'index/' + this._indexHandle(indexHandle),
      function (err, result) {
        if (err) callback(err);
        else callback(null, result);
      }
    );
  },
  createIndex: function (details, callback) {
    if (!callback) callback = noop;
    this._api.post('index', details, {
      collection: this.name
    }, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  dropIndex: function (indexHandle, callback) {
    if (!callback) callback = noop;
    this._api.delete(
      'index/' + this._indexHandle(indexHandle),
      function (err, result) {
        if (err) callback(err);
        else callback(null, result);
      }
    );
  },
  createCapConstraint: function (size, callback) {
    if (typeof size === 'number') {
      size = {size: size};
    }
    if (!callback) callback = noop;
    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  createHashIndex: function (fields, unique, callback) {
    if (typeof unique === 'function') {
      callback = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (!callback) callback = noop;
    this._api.post('index', {
      type: 'hash',
      fields: fields,
      unique: Boolean(unique)
    }, {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  createSkipList: function (fields, unique, callback) {
    if (typeof unique === 'function') {
      callback = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (!callback) callback = noop;
    this._api.post('index', {
      type: 'skiplist',
      fields: fields,
      unique: Boolean(unique)
    }, {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  createGeoIndex: function (fields, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (!callback) callback = noop;
    this._api.post('index', extend({}, opts, {
      type: 'geo',
      fields: fields
    }), {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  createFulltextIndex: function (fields, minLength, callback) {
    if (typeof minLength === 'function') {
      callback = minLength;
      minLength = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (!callback) callback = noop;
    this._api.post('index', {
      type: 'fulltext',
      fields: fields,
      minLength: minLength ? Number(minLength) : undefined
    }, {collection: this.name}, function (err, result) {
      if (err) callback(err);
      else callback(null, result);
    });
  },
  fulltext: function (field, query, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.index) opts.index = this._indexHandle(opts.index);
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.put('simple/fulltext', extend(opts, {
      collection: this.name,
      attribute: field,
      query: query
    }), function (err, body) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, body));
    });
  },
  near: function (latitude, longitude, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.put('simple/near', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude
    }), function (err, body) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, body));
    });
  },
  within: function (latitude, longitude, radius, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.put('simple/within', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude,
      radius: Number(radius)
    }), function (err, body) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, body));
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
    this._api.get('document/' + this._documentHandle(documentHandle), function (err, body) {
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
    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  save: function (data, fromId, toId, callback) {
    if (!callback) callback = noop;
    this._api.post('edge/', data, {
      collection: this.name,
      from: this._documentHandle(fromId),
      to: this._documentHandle(toId)
    }, function (err, body) {
      if (err) callback(err);
      else callback(null, body);
    });
  },
  _edges: function (documentHandle, direction, callback) {
    if (!callback) callback = noop;
    this._api.get('edges/' + this.name, {
      vertex: this._documentHandle(documentHandle),
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
  },
  traversal: function (startVertex, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      edgeCollection: this.name
    }), function (err, data) {
      if (err) callback(err);
      else callback(null, data.result);
    });
  }
});

