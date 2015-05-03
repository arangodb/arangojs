'use strict';
var promisify = require('./util/promisify');
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

    var _promisify = promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

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
    var _promisify2 = promisify(cb);

    var promise = _promisify2.promise;
    var callback = _promisify2.callback;

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
    var _promisify3 = promisify(cb);

    var promise = _promisify3.promise;
    var callback = _promisify3.callback;

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

    var _promisify4 = promisify(cb);

    var promise = _promisify4.promise;
    var callback = _promisify4.callback;

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

    var _promisify5 = promisify(cb);

    var promise = _promisify5.promise;
    var callback = _promisify5.callback;

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

    var _promisify6 = promisify(cb);

    var promise = _promisify6.promise;
    var callback = _promisify6.callback;

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

    var _promisify7 = promisify(cb);

    var promise = _promisify7.promise;
    var callback = _promisify7.callback;

    this._api.get('document', {
      type: type || 'id',
      collection: this.name
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

    var _promisify8 = promisify(cb);

    var promise = _promisify8.promise;
    var callback = _promisify8.callback;

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
    var _promisify9 = promisify(cb);

    var promise = _promisify9.promise;
    var callback = _promisify9.callback;

    this._api.get('index', { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body.indexes);
    });
    return promise;
  },
  index: function index(indexHandle, cb) {
    var _promisify10 = promisify(cb);

    var promise = _promisify10.promise;
    var callback = _promisify10.callback;

    this._api.get('index/' + this._indexHandle(indexHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createIndex: function createIndex(details, cb) {
    var _promisify11 = promisify(cb);

    var promise = _promisify11.promise;
    var callback = _promisify11.callback;

    this._api.post('index', details, {
      collection: this.name
    }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  dropIndex: function dropIndex(indexHandle, cb) {
    var _promisify12 = promisify(cb);

    var promise = _promisify12.promise;
    var callback = _promisify12.callback;

    this._api['delete']('index/' + this._indexHandle(indexHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createCapConstraint: function createCapConstraint(size, cb) {
    if (typeof size === 'number') {
      size = { size: size };
    }

    var _promisify13 = promisify(cb);

    var promise = _promisify13.promise;
    var callback = _promisify13.callback;

    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createHashIndex: function createHashIndex(fields, unique, cb) {
    if (typeof unique === 'function') {
      cb = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }

    var _promisify14 = promisify(cb);

    var promise = _promisify14.promise;
    var callback = _promisify14.callback;

    this._api.post('index', {
      type: 'hash',
      fields: fields,
      unique: Boolean(unique)
    }, { collection: this.name }, function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  createSkipList: function createSkipList(fields, unique, cb) {
    if (typeof unique === 'function') {
      cb = unique;
      unique = undefined;
    }
    if (typeof fields === 'string') {
      fields = [fields];
    }

    var _promisify15 = promisify(cb);

    var promise = _promisify15.promise;
    var callback = _promisify15.callback;

    this._api.post('index', {
      type: 'skiplist',
      fields: fields,
      unique: Boolean(unique)
    }, { collection: this.name }, function (err, res) {
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

    var _promisify16 = promisify(cb);

    var promise = _promisify16.promise;
    var callback = _promisify16.callback;

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

    var _promisify17 = promisify(cb);

    var promise = _promisify17.promise;
    var callback = _promisify17.callback;

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

    var _promisify18 = promisify(cb);

    var promise = _promisify18.promise;
    var callback = _promisify18.callback;

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

    var _promisify19 = promisify(cb);

    var promise = _promisify19.promise;
    var callback = _promisify19.callback;

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

    var _promisify20 = promisify(cb);

    var promise = _promisify20.promise;
    var callback = _promisify20.callback;

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
    var _promisify21 = promisify(cb);

    var promise = _promisify21.promise;
    var callback = _promisify21.callback;

    this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  save: function save(data, cb) {
    var _promisify22 = promisify(cb);

    var promise = _promisify22.promise;
    var callback = _promisify22.callback;

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
    var _promisify23 = promisify(cb);

    var promise = _promisify23.promise;
    var callback = _promisify23.callback;

    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
      if (err) callback(err);else callback(null, res.body);
    });
    return promise;
  },
  save: function save(data, fromId, toId, cb) {
    var _promisify24 = promisify(cb);

    var promise = _promisify24.promise;
    var callback = _promisify24.callback;

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
    var _promisify25 = promisify(cb);

    var promise = _promisify25.promise;
    var callback = _promisify25.callback;

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

    var _promisify26 = promisify(cb);

    var promise = _promisify26.promise;
    var callback = _promisify26.callback;

    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      edgeCollection: this.name
    }), function (err, res) {
      if (err) callback(err);else callback(null, res.body.result);
    });
    return promise;
  }
});