'use strict';
var promisify = require('./util/promisify');
var inherits = require('util').inherits;
var extend = require('extend');
var ArrayCursor = require('./cursor');

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
  this._api = this._connection.route('_api');
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
  _get: function (path, update, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.get('collection/' + self.name + '/' + path, opts, function (err, res) {
      if (err) callback(err);
      else {
        if (update) {
          extend(self, res.body);
          delete self.code;
          delete self.error;
        }
        callback(null, res.body);
      }
    });
    return promise;
  },
  _put: function (path, data, update, cb) {
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.put('collection/' + self.name + '/' + path, data, function (err, res) {
      if (err) callback(err);
      else {
        if (update) extend(self, res.body);
        callback(null, res.body);
      }
    });
    return promise;
  },
  properties: function (cb) {
    return this._get('properties', true, cb);
  },
  count: function (cb) {
    return this._get('count', true, cb);
  },
  figures: function (cb) {
    return this._get('figures', true, cb);
  },
  revision: function (cb) {
    return this._get('revision', true, cb);
  },
  checksum: function (opts, cb) {
    return this._get('checksum', true, opts, cb);
  },
  load: function (count, cb) {
    if (typeof count === 'function') {
      cb = count;
      count = undefined;
    }
    return this._put('load', (
      typeof count === 'boolean' ? {count: count} : undefined
    ), true, cb);
  },
  unload: function (cb) {
    return this._put('unload', undefined, true, cb);
  },
  setProperties: function (properties, cb) {
    return this._put('properties', properties, true, cb);
  },
  rename: function (name, cb) {
    return this._put('rename', {name: name}, true, cb);
  },
  rotate: function (cb) {
    return this._put('rotate', undefined, false, cb);
  },
  truncate: function (cb) {
    return this._put('truncate', undefined, true, cb);
  },
  drop: function (cb) {
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.delete('collection/' + self.name, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  replace: function (documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.put(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  update: function (documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.patch(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  remove: function (documentHandle, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.delete(this._documentPath(documentHandle), opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  all: function (type, cb) {
    if (typeof type === 'function') {
      cb = type;
      type = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._api.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.documents);
    });
    return promise;
  },
  import: function (data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._api.request({
      method: 'POST',
      path: 'import',
      body: data,
      ld: Boolean(!opts || opts.type !== 'array'),
      qs: extend({
        type: 'auto'
      }, opts, {
        collection: this.name
      })
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  indexes: function (cb) {
    var {promise, callback} = promisify(cb);
    this._api.get('index', {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.indexes);
    });
    return promise;
  },
  index: function (indexHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._api.get(
      'index/' + this._indexHandle(indexHandle),
      function (err, res) {
        if (err) callback(err);
        else callback(null, res.body);
      }
    );
    return promise;
  },
  createIndex: function (details, cb) {
    var {promise, callback} = promisify(cb);
    this._api.post('index', details, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  dropIndex: function (indexHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._api.delete(
      'index/' + this._indexHandle(indexHandle),
      function (err, res) {
        if (err) callback(err);
        else callback(null, res.body);
      }
    );
    return promise;
  },
  createCapConstraint: function (size, cb) {
    if (typeof size === 'number') {
      size = {size: size};
    }
    var {promise, callback} = promisify(cb);
    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createHashIndex: function (fields, unique, cb) {
    if (typeof unique === 'function') {
      cb = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = promisify(cb);
    this._api.post('index', {
      type: 'hash',
      fields: fields,
      unique: Boolean(unique)
    }, {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createSkipList: function (fields, unique, cb) {
    if (typeof unique === 'function') {
      cb = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = promisify(cb);
    this._api.post('index', {
      type: 'skiplist',
      fields: fields,
      unique: Boolean(unique)
    }, {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createGeoIndex: function (fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = promisify(cb);
    this._api.post('index', extend({}, opts, {
      type: 'geo',
      fields: fields
    }), {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createFulltextIndex: function (fields, minLength, cb) {
    if (typeof minLength === 'function') {
      cb = minLength;
      minLength = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = promisify(cb);
    this._api.post('index', {
      type: 'fulltext',
      fields: fields,
      minLength: minLength ? Number(minLength) : undefined
    }, {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  fulltext: function (field, query, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.index) opts.index = this._indexHandle(opts.index);
    }
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.put('simple/fulltext', extend(opts, {
      collection: this.name,
      attribute: field,
      query: query
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  },
  near: function (latitude, longitude, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.put('simple/near', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  },
  within: function (latitude, longitude, radius, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    var {promise, callback} = promisify(cb);
    var self = this;
    self._api.put('simple/within', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude,
      radius: Number(radius)
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  }
});

function DocumentCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(DocumentCollection, BaseCollection);

extend(DocumentCollection.prototype, {
  document: function (documentHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save: function (data, cb) {
    var {promise, callback} = promisify(cb);
    this._api.post('document/', data, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  }
});

function EdgeCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function (documentHandle, cb) {
    var {promise, callback} = promisify(cb);
    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save: function (data, fromId, toId, cb) {
    var {promise, callback} = promisify(cb);
    this._api.post('edge/', data, {
      collection: this.name,
      from: this._documentHandle(fromId),
      to: this._documentHandle(toId)
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  _edges: function (documentHandle, direction, cb) {
    var {promise, callback} = promisify(cb);
    this._api.get('edges/' + this.name, {
      vertex: this._documentHandle(documentHandle),
      direction: direction
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.edges);
    });
    return promise;
  },
  edges: function (vertex, cb) {
    return this._edges(vertex, undefined, cb);
  },
  inEdges: function (vertex, cb) {
    return this._edges(vertex, 'in', cb);
  },
  outEdges: function (vertex, cb) {
    return this._edges(vertex, 'out', cb);
  },
  traversal: function (startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = promisify(cb);
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      edgeCollection: this.name
    }), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.result);
    });
    return promise;
  }
});
