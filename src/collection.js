'use strict';
var inherits = require('util').inherits;
var extend = require('extend');
var ArrayCursor = require('./cursor');

var types = {
  DOCUMENT_COLLECTION: 2,
  EDGE_COLLECTION: 3
};

module.exports = extend(
  function (connection, body) {
    var Ctor = (body.type === types.EDGE_COLLECTION ? EdgeCollection : DocumentCollection);
    return new Ctor(connection, body);
  }, {
    _BaseCollection: BaseCollection,
    DocumentCollection: DocumentCollection,
    EdgeCollection: EdgeCollection,
    types: types
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
  _documentPath(documentHandle) {
    return (this.type === types.EDGE_COLLECTION ? 'edge/' : 'document/') + this._documentHandle(documentHandle);
  },
  _documentHandle(documentHandle) {
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
  _indexHandle(indexHandle) {
    if (indexHandle.id) {
      indexHandle = indexHandle.id;
    }
    if (indexHandle.indexOf('/') === -1) {
      indexHandle = this.name + '/' + indexHandle;
    }
    return indexHandle;
  },
  _get(path, update, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  _put(path, data, update, cb) {
    var {promise, callback} = this._connection.promisify(cb);
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
  properties(cb) {
    return this._get('properties', true, cb);
  },
  count(cb) {
    return this._get('count', true, cb);
  },
  figures(cb) {
    return this._get('figures', true, cb);
  },
  revision(cb) {
    return this._get('revision', true, cb);
  },
  checksum(opts, cb) {
    return this._get('checksum', true, opts, cb);
  },
  load(count, cb) {
    if (typeof count === 'function') {
      cb = count;
      count = undefined;
    }
    return this._put('load', (
      typeof count === 'boolean' ? {count: count} : undefined
    ), true, cb);
  },
  unload(cb) {
    return this._put('unload', undefined, true, cb);
  },
  setProperties(properties, cb) {
    return this._put('properties', properties, true, cb);
  },
  rename(name, cb) {
    return this._put('rename', {name: name}, true, cb);
  },
  rotate(cb) {
    return this._put('rotate', undefined, false, cb);
  },
  truncate(cb) {
    return this._put('truncate', undefined, true, cb);
  },
  drop(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    var self = this;
    self._api.delete('collection/' + self.name, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  replace(documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.put(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  update(documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.patch(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  remove(documentHandle, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    opts = extend({}, opts, {collection: this.name});
    this._api.delete(this._documentPath(documentHandle), opts, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  all(type, cb) {
    if (typeof type === 'function') {
      cb = type;
      type = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.documents);
    });
    return promise;
  },
  byKeys(keys, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.put('simple/lookup-by-keys', {
      collection: this.name,
      keys
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.documents);
    });
    return promise;
  },
  import(data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  indexes(cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('index', {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.indexes);
    });
    return promise;
  },
  index(indexHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get(
      'index/' + this._indexHandle(indexHandle),
      function (err, res) {
        if (err) callback(err);
        else callback(null, res.body);
      }
    );
    return promise;
  },
  createIndex(details, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('index', details, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  dropIndex(indexHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.delete(
      'index/' + this._indexHandle(indexHandle),
      function (err, res) {
        if (err) callback(err);
        else callback(null, res.body);
      }
    );
    return promise;
  },
  createCapConstraint(size, cb) {
    if (typeof size === 'number') {
      size = {size: size};
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createHashIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = {unique: opts};
    }
    var {promise, callback} = this._connection.promisify(cb);
    opts = extend({unique: false}, opts, {type: 'hash', fields: fields});
    this._api.post('index', opts, {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createSkipList(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = {unique: opts};
    }
    var {promise, callback} = this._connection.promisify(cb);
    opts = extend({unique: false}, opts, {type: 'skiplist', fields: fields});
    this._api.post('index', opts, {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createGeoIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = this._connection.promisify(cb);
    this._api.post('index', extend({}, opts, {
      type: 'geo',
      fields: fields
    }), {collection: this.name}, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  createFulltextIndex(fields, minLength, cb) {
    if (typeof minLength === 'function') {
      cb = minLength;
      minLength = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  fulltext(field, query, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.index) opts.index = this._indexHandle(opts.index);
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  near(latitude, longitude, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  within(latitude, longitude, radius, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }
    var {promise, callback} = this._connection.promisify(cb);
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
  document(documentHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save(data, cb) {
    var {promise, callback} = this._connection.promisify(cb);
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
  edge(documentHandle, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);
      else callback(null, res.body);
    });
    return promise;
  },
  save(data, fromId, toId, cb) {
    var {promise, callback} = this._connection.promisify(cb);
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
  _edges(documentHandle, direction, cb) {
    var {promise, callback} = this._connection.promisify(cb);
    this._api.get('edges/' + this.name, {
      vertex: this._documentHandle(documentHandle),
      direction: direction
    }, function (err, res) {
      if (err) callback(err);
      else callback(null, res.body.edges);
    });
    return promise;
  },
  edges(vertex, cb) {
    return this._edges(vertex, undefined, cb);
  },
  inEdges(vertex, cb) {
    return this._edges(vertex, 'in', cb);
  },
  outEdges(vertex, cb) {
    return this._edges(vertex, 'out', cb);
  },
  traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    var {promise, callback} = this._connection.promisify(cb);
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
