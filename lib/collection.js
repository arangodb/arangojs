'use strict';
var inherits = require('util').inherits;
var extend = require('extend');
var ArrayCursor = require('./cursor');

var types = {
  DOCUMENT_COLLECTION: 2,
  EDGE_COLLECTION: 3
};

module.exports = extend(function (connection, body) {
  var Ctor = body.type === types.EDGE_COLLECTION ? EdgeCollection : DocumentCollection;
  return new Ctor(connection, body);
}, {
  _BaseCollection: BaseCollection,
  DocumentCollection: DocumentCollection,
  EdgeCollection: EdgeCollection,
  types: types
});

function BaseCollection(connection, body) {
  this._connection = connection;
  this._api = this._connection.route('_api');
  extend(this, body);
  delete this.code;
  delete this.error;
}

extend(BaseCollection.prototype, {
  _documentPath: function _documentPath(documentHandle) {
    return (this.type === types.EDGE_COLLECTION ? 'edge/' : 'document/') + this._documentHandle(documentHandle);
  },
  _documentHandle: function _documentHandle(documentHandle) {
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
  _indexHandle: function _indexHandle(indexHandle) {
    if (indexHandle.id) {
      indexHandle = indexHandle.id;
    }
    if (indexHandle.indexOf('/') === -1) {
      indexHandle = this.name + '/' + indexHandle;
    }
    return indexHandle;
  },
  _get: function _get(path, update, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify = this._connection.promisify(cb);

    var promise = _connection$promisify.promise;
    var callback = _connection$promisify.callback;

    var self = this;
    self._api.get('collection/' + self.name + '/' + path, opts, function (err, res) {
      if (err) callback(err);else {
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
  _put: function _put(path, data, update, cb) {
    var _connection$promisify2 = this._connection.promisify(cb);

    var promise = _connection$promisify2.promise;
    var callback = _connection$promisify2.callback;

    var self = this;
    self._api.put('collection/' + self.name + '/' + path, data, function (err, res) {
      if (err) callback(err);else {
        if (update) extend(self, res.body);
        callback(null, res.body);
      }
    });
    return promise;
  },
  properties: function properties(cb) {
    return this._get('properties', true, cb);
  },
  count: function count(cb) {
    return this._get('count', true, cb);
  },
  figures: function figures(cb) {
    return this._get('figures', true, cb);
  },
  revision: function revision(cb) {
    return this._get('revision', true, cb);
  },
  checksum: function checksum(opts, cb) {
    return this._get('checksum', true, opts, cb);
  },
  load: function load(count, cb) {
    if (typeof count === 'function') {
      cb = count;
      count = undefined;
    }
    return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, true, cb);
  },
  unload: function unload(cb) {
    return this._put('unload', undefined, true, cb);
  },
  setProperties: function setProperties(properties, cb) {
    return this._put('properties', properties, true, cb);
  },
  rename: function rename(name, cb) {
    return this._put('rename', { name: name }, true, cb);
  },
  rotate: function rotate(cb) {
    return this._put('rotate', undefined, false, cb);
  },
  truncate: function truncate(cb) {
    return this._put('truncate', undefined, true, cb);
  },
  drop: function drop(cb) {
    var _connection$promisify3 = this._connection.promisify(cb);

    var promise = _connection$promisify3.promise;
    var callback = _connection$promisify3.callback;

    var self = this;
    self._api['delete']('collection/' + self.name, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  replace: function replace(documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify4 = this._connection.promisify(cb);

    var promise = _connection$promisify4.promise;
    var callback = _connection$promisify4.callback;

    opts = extend({}, opts, { collection: this.name });
    this._api.put(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  update: function update(documentHandle, data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify5 = this._connection.promisify(cb);

    var promise = _connection$promisify5.promise;
    var callback = _connection$promisify5.callback;

    opts = extend({}, opts, { collection: this.name });
    this._api.patch(this._documentPath(documentHandle), data, opts, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  remove: function remove(documentHandle, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify6 = this._connection.promisify(cb);

    var promise = _connection$promisify6.promise;
    var callback = _connection$promisify6.callback;

    opts = extend({}, opts, { collection: this.name });
    this._api['delete'](this._documentPath(documentHandle), opts, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  all: function all(type, cb) {
    if (typeof type === 'function') {
      cb = type;
      type = undefined;
    }

    var _connection$promisify7 = this._connection.promisify(cb);

    var promise = _connection$promisify7.promise;
    var callback = _connection$promisify7.callback;

    this._api.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.documents);
    });
    return promise;
  },
  byKeys: function byKeys(keys, cb) {
    var _connection$promisify8 = this._connection.promisify(cb);

    var promise = _connection$promisify8.promise;
    var callback = _connection$promisify8.callback;

    this._api.put('simple/lookup-by-keys', {
      collection: this.name,
      keys: keys
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.documents);
    });
    return promise;
  },
  'import': function _import(data, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify9 = this._connection.promisify(cb);

    var promise = _connection$promisify9.promise;
    var callback = _connection$promisify9.callback;

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
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  indexes: function indexes(cb) {
    var _connection$promisify10 = this._connection.promisify(cb);

    var promise = _connection$promisify10.promise;
    var callback = _connection$promisify10.callback;

    this._api.get('index', { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.indexes);
    });
    return promise;
  },
  index: function index(indexHandle, cb) {
    var _connection$promisify11 = this._connection.promisify(cb);

    var promise = _connection$promisify11.promise;
    var callback = _connection$promisify11.callback;

    this._api.get('index/' + this._indexHandle(indexHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createIndex: function createIndex(details, cb) {
    var _connection$promisify12 = this._connection.promisify(cb);

    var promise = _connection$promisify12.promise;
    var callback = _connection$promisify12.callback;

    this._api.post('index', details, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  dropIndex: function dropIndex(indexHandle, cb) {
    var _connection$promisify13 = this._connection.promisify(cb);

    var promise = _connection$promisify13.promise;
    var callback = _connection$promisify13.callback;

    this._api['delete']('index/' + this._indexHandle(indexHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createCapConstraint: function createCapConstraint(size, cb) {
    if (typeof size === 'number') {
      size = { size: size };
    }

    var _connection$promisify14 = this._connection.promisify(cb);

    var promise = _connection$promisify14.promise;
    var callback = _connection$promisify14.callback;

    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createHashIndex: function createHashIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = { unique: opts };
    }

    var _connection$promisify15 = this._connection.promisify(cb);

    var promise = _connection$promisify15.promise;
    var callback = _connection$promisify15.callback;

    opts = extend({ unique: false }, opts, { type: 'hash', fields: fields });
    this._api.post('index', opts, { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createSkipList: function createSkipList(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }
    if (typeof opts === 'boolean') {
      opts = { unique: opts };
    }

    var _connection$promisify16 = this._connection.promisify(cb);

    var promise = _connection$promisify16.promise;
    var callback = _connection$promisify16.callback;

    opts = extend({ unique: false }, opts, { type: 'skiplist', fields: fields });
    this._api.post('index', opts, { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createGeoIndex: function createGeoIndex(fields, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }

    var _connection$promisify17 = this._connection.promisify(cb);

    var promise = _connection$promisify17.promise;
    var callback = _connection$promisify17.callback;

    this._api.post('index', extend({}, opts, {
      type: 'geo',
      fields: fields
    }), { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createFulltextIndex: function createFulltextIndex(fields, minLength, cb) {
    if (typeof minLength === 'function') {
      cb = minLength;
      minLength = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }

    var _connection$promisify18 = this._connection.promisify(cb);

    var promise = _connection$promisify18.promise;
    var callback = _connection$promisify18.callback;

    this._api.post('index', {
      type: 'fulltext',
      fields: fields,
      minLength: minLength ? Number(minLength) : undefined
    }, { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  fulltext: function fulltext(field, query, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.index) opts.index = this._indexHandle(opts.index);
    }

    var _connection$promisify19 = this._connection.promisify(cb);

    var promise = _connection$promisify19.promise;
    var callback = _connection$promisify19.callback;

    var self = this;
    self._api.put('simple/fulltext', extend(opts, {
      collection: this.name,
      attribute: field,
      query: query
    }), function (err, res) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  },
  near: function near(latitude, longitude, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }

    var _connection$promisify20 = this._connection.promisify(cb);

    var promise = _connection$promisify20.promise;
    var callback = _connection$promisify20.callback;

    var self = this;
    self._api.put('simple/near', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude
    }), function (err, res) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  },
  within: function within(latitude, longitude, radius, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (opts) {
      opts = extend({}, opts);
      if (opts.geo) opts.geo = this._indexHandle(opts.geo);
    }

    var _connection$promisify21 = this._connection.promisify(cb);

    var promise = _connection$promisify21.promise;
    var callback = _connection$promisify21.callback;

    var self = this;
    self._api.put('simple/within', extend(opts, {
      collection: this.name,
      latitude: latitude,
      longitude: longitude,
      radius: Number(radius)
    }), function (err, res) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, res.body));
    });
    return promise;
  }
});

function DocumentCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(DocumentCollection, BaseCollection);

extend(DocumentCollection.prototype, {
  document: function document(documentHandle, cb) {
    var _connection$promisify22 = this._connection.promisify(cb);

    var promise = _connection$promisify22.promise;
    var callback = _connection$promisify22.callback;

    this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  save: function save(data, cb) {
    var _connection$promisify23 = this._connection.promisify(cb);

    var promise = _connection$promisify23.promise;
    var callback = _connection$promisify23.callback;

    this._api.post('document/', data, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  }
});

function EdgeCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function edge(documentHandle, cb) {
    var _connection$promisify24 = this._connection.promisify(cb);

    var promise = _connection$promisify24.promise;
    var callback = _connection$promisify24.callback;

    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  save: function save(data, fromId, toId, cb) {
    var _connection$promisify25 = this._connection.promisify(cb);

    var promise = _connection$promisify25.promise;
    var callback = _connection$promisify25.callback;

    this._api.post('edge/', data, {
      collection: this.name,
      from: this._documentHandle(fromId),
      to: this._documentHandle(toId)
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  _edges: function _edges(documentHandle, direction, cb) {
    var _connection$promisify26 = this._connection.promisify(cb);

    var promise = _connection$promisify26.promise;
    var callback = _connection$promisify26.callback;

    this._api.get('edges/' + this.name, {
      vertex: this._documentHandle(documentHandle),
      direction: direction
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.edges);
    });
    return promise;
  },
  edges: function edges(vertex, cb) {
    return this._edges(vertex, undefined, cb);
  },
  inEdges: function inEdges(vertex, cb) {
    return this._edges(vertex, 'in', cb);
  },
  outEdges: function outEdges(vertex, cb) {
    return this._edges(vertex, 'out', cb);
  },
  traversal: function traversal(startVertex, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }

    var _connection$promisify27 = this._connection.promisify(cb);

    var promise = _connection$promisify27.promise;
    var callback = _connection$promisify27.callback;

    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      edgeCollection: this.name
    }), function (err, res) {
      if (err) callback(err);else callback(null, res.body.result);
    });
    return promise;
  }
});