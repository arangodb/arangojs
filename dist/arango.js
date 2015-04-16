!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.arangojs=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';
module.exports = require('./lib/database');

},{"./lib/database":5}],2:[function(require,module,exports){
'use strict';
var noop = require('./util/noop');
var inherits = require('util').inherits;
var extend = require('extend');
var ArrayCursor = require('./cursor');

module.exports = extend(function (connection, body) {
  var Ctor = body.type === 3 ? EdgeCollection : DocumentCollection;
  return new Ctor(connection, body);
}, {
  _BaseCollection: BaseCollection,
  DocumentCollection: DocumentCollection,
  EdgeCollection: EdgeCollection
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
    return (this.type === 3 ? 'edge/' : 'document/') + this._documentHandle(documentHandle);
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
  _get: function _get(path, update, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + self.name + '/' + path, opts, function (err, body) {
      if (err) callback(err);else {
        if (update) {
          extend(self, body);
          delete self.code;
          delete self.error;
        }
        callback(null, body);
      }
    });
  },
  _put: function _put(path, data, update, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.put('collection/' + self.name + '/' + path, data, function (err, body) {
      if (err) callback(err);else {
        if (update) extend(self, body);
        callback(null, body);
      }
    });
  },
  properties: function properties(callback) {
    return this._get('properties', true, callback);
  },
  count: function count(callback) {
    return this._get('count', true, callback);
  },
  figures: function figures(callback) {
    return this._get('figures', true, callback);
  },
  revision: function revision(callback) {
    return this._get('revision', true, callback);
  },
  checksum: function checksum(opts, callback) {
    return this._get('checksum', true, opts, callback);
  },
  load: function load(count, callback) {
    if (typeof count === 'function') {
      callback = count;
      count = undefined;
    }
    return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, true, callback);
  },
  unload: function unload(callback) {
    return this._put('unload', undefined, true, callback);
  },
  setProperties: function setProperties(properties, callback) {
    return this._put('properties', properties, true, callback);
  },
  rename: function rename(name, callback) {
    return this._put('rename', { name: name }, true, callback);
  },
  rotate: function rotate(callback) {
    return this._put('rotate', undefined, false, callback);
  },
  truncate: function truncate(callback) {
    return this._put('truncate', undefined, true, callback);
  },
  drop: function drop(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api['delete']('collection/' + self.name, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  replace: function replace(documentHandle, data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, { collection: this.name });
    this._api.put(this._documentPath(documentHandle), data, opts, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  update: function update(documentHandle, data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, { collection: this.name });
    this._api.patch(this._documentPath(documentHandle), data, opts, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  remove: function remove(documentHandle, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
    opts = extend({}, opts, { collection: this.name });
    this._api['delete'](this._documentPath(documentHandle), opts, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  all: function all(type, callback) {
    if (typeof type === 'function') {
      callback = type;
      type = undefined;
    }
    if (!callback) callback = noop;
    this._api.get('document', {
      type: type || 'id',
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);else callback(null, body.documents);
    });
  },
  'import': function _import(data, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    if (!callback) callback = noop;
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
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  indexes: function indexes(callback) {
    if (!callback) callback = noop;
    this._api.get('index', { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result.indexes);
    });
  },
  index: function index(indexHandle, callback) {
    if (!callback) callback = noop;
    this._api.get('index/' + this._indexHandle(indexHandle), function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createIndex: function createIndex(details, callback) {
    if (!callback) callback = noop;
    this._api.post('index', details, {
      collection: this.name
    }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  dropIndex: function dropIndex(indexHandle, callback) {
    if (!callback) callback = noop;
    this._api['delete']('index/' + this._indexHandle(indexHandle), function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createCapConstraint: function createCapConstraint(size, callback) {
    if (typeof size === 'number') {
      size = { size: size };
    }
    if (!callback) callback = noop;
    this._api.post('index', extend({}, size, {
      type: 'cap'
    }), { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createHashIndex: function createHashIndex(fields, unique, callback) {
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
    }, { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createSkipList: function createSkipList(fields, unique, callback) {
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
    }, { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createGeoIndex: function createGeoIndex(fields, opts, callback) {
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
    }), { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  createFulltextIndex: function createFulltextIndex(fields, minLength, callback) {
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
    }, { collection: this.name }, function (err, result) {
      if (err) callback(err);else callback(null, result);
    });
  },
  fulltext: function fulltext(field, query, opts, callback) {
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
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, body));
    });
  },
  near: function near(latitude, longitude, opts, callback) {
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
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, body));
    });
  },
  within: function within(latitude, longitude, radius, opts, callback) {
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
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, body));
    });
  }
});

function DocumentCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(DocumentCollection, BaseCollection);

extend(DocumentCollection.prototype, {
  document: function document(documentHandle, callback) {
    if (!callback) callback = noop;
    this._api.get('document/' + this._documentHandle(documentHandle), function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  save: function save(data, callback) {
    if (!callback) callback = noop;
    this._api.post('document/', data, {
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  }
});

function EdgeCollection(connection, body) {
  BaseCollection.call(this, connection, body);
}

inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function edge(documentHandle, callback) {
    if (!callback) callback = noop;
    this._api.get('edge/' + this._documentHandle(documentHandle), function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  save: function save(data, fromId, toId, callback) {
    if (!callback) callback = noop;
    this._api.post('edge/', data, {
      collection: this.name,
      from: this._documentHandle(fromId),
      to: this._documentHandle(toId)
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  _edges: function _edges(documentHandle, direction, callback) {
    if (!callback) callback = noop;
    this._api.get('edges/' + this.name, {
      vertex: this._documentHandle(documentHandle),
      direction: direction
    }, function (err, body) {
      if (err) callback(err);else callback(null, body.edges);
    });
  },
  edges: function edges(vertex, callback) {
    return this._edges(vertex, undefined, callback);
  },
  inEdges: function inEdges(vertex, callback) {
    return this._edges(vertex, 'in', callback);
  },
  outEdges: function outEdges(vertex, callback) {
    return this._edges(vertex, 'out', callback);
  },
  traversal: function traversal(startVertex, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      edgeCollection: this.name
    }), function (err, data) {
      if (err) callback(err);else callback(null, data.result);
    });
  }
});
},{"./cursor":4,"./util/noop":10,"extend":"extend","util":17}],3:[function(require,module,exports){
'use strict';
var noop = require('./util/noop');
var extend = require('extend');
var qs = require('querystring');
var xhr = require('request');
var ArangoError = require('./error');
var Route = require('./route');
var jsonMime = /\/(json|javascript)(\W|$)/;

module.exports = Connection;

function Connection(config) {
  if (typeof config === 'string') {
    config = { url: config };
  }
  this.config = extend({}, Connection.defaults, config);
  if (!this.config.headers) this.config.headers = {};
  if (!this.config.headers['x-arango-version']) {
    this.config.headers['x-arango-version'] = this.config.arangoVersion;
  }
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300
};

extend(Connection.prototype, {
  _resolveUrl: function _resolveUrl(opts) {
    var url = this.config.url;
    if (!opts.absolutePath) {
      url += '/_db/' + this.config.databaseName;
      if (opts.basePath) url += '/' + opts.basePath;
    }
    url += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
    if (opts.qs) url += '?' + (typeof opts.qs === 'string' ? opts.qs : qs.stringify(opts.qs));
    return url;
  },
  route: function route(path) {
    return new Route(this, path);
  },
  request: function request(opts, callback) {
    if (!callback) callback = noop;
    if (!opts) opts = {};
    var body = opts.body;
    var headers = { 'content-type': 'text/plain' };

    if (body && typeof body === 'object') {
      if (opts.ld) {
        body = body.map(function (obj) {
          return JSON.stringify(obj);
        }).join('\r\n') + '\r\n';
        headers['content-type'] = 'application/x-ldjson';
      } else {
        body = JSON.stringify(body);
        headers['content-type'] = 'application/json';
      }
    }

    xhr({
      url: this._resolveUrl(opts),
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body
    }, function (err, response, rawBody) {
      if (err) callback(err, rawBody, response);else if (!response.headers['content-type'].match(jsonMime)) callback(null, rawBody, response);else {
        var body;
        try {
          body = JSON.parse(rawBody);
        } catch (e) {
          return callback(e, rawBody, response);
        }
        callback(body.error ? new ArangoError(body) : null, body, response);
      }
    });
  }
});
},{"./error":6,"./route":8,"./util/noop":10,"extend":"extend","querystring":15,"request":"request"}],4:[function(require,module,exports){
'use strict';
var noop = require('./util/noop');
var extend = require('extend');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this.extra = body.extra;
  this._connection = connection;
  this._api = this._connection.route('_api');
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._index = 0;
}

extend(ArrayCursor.prototype, {
  _drain: function _drain(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._more(function (err) {
      if (err) callback(err);else if (!self._hasMore) callback(null, self);else self._drain(callback);
    });
  },
  _more: function _more(callback) {
    if (!callback) callback = noop;
    var self = this;
    if (!self._hasMore) callback(null, self);else {
      self._api.put('cursor/' + this._id, function (err, body) {
        if (err) callback(err);else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all: function all(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      self._index = self._result.length;
      if (err) callback(err);else callback(null, self._result);
    });
  },
  next: function next(callback) {
    if (!callback) callback = noop;
    var self = this;
    function next() {
      var value = self._result[self._index];
      self._index += 1;
      callback(null, value);
    }
    if (self._index < self._result.length) next();else {
      if (!self._hasMore) callback(null);else {
        self._more(function (err) {
          if (err) callback(err);else next();
        });
      }
    }
  },
  hasNext: function hasNext() {
    return this._hasMore || this._index < this._result.length;
  },
  each: function each(fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      if (err) callback(err);else {
        try {
          var result;
          for (self._index = 0; self._index < self._result.length; self._index++) {
            result = fn(self._result[self._index], self._index, self);
            if (result === false) break;
          }
          callback(null);
        } catch (e) {
          callback(e);
        }
      }
    });
  },
  every: function every(fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function loop() {
      try {
        var result = true;
        while (self._index < self._result.length) {
          result = fn(self._result[self._index], self._index, self);
          self._index++;
          if (!result) break;
        }
        if (!self._hasMore || !result) callback(null, result);else {
          self._more(function (err) {
            if (err) callback(err);else loop();
          });
        }
      } catch (e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
  },
  some: function some(fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function loop() {
      try {
        var result = false;
        while (self._index < self._result.length) {
          result = fn(self._result[self._index], self._index, self);
          self._index++;
          if (result) break;
        }
        if (!self._hasMore || result) callback(null, result);else {
          self._more(function (err) {
            if (err) callback(err);else loop();
          });
        }
      } catch (e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
  },
  map: function map(fn, callback) {
    if (!callback) callback = noop;
    var self = this,
        result = [];

    function loop(x) {
      try {
        while (self._index < self._result.length) {
          result.push(fn(self._result[self._index], self._index, self));
          self._index++;
        }
        if (!self._hasMore) callback(null, result);else {
          self._more(function (err) {
            if (err) callback(err);else loop();
          });
        }
      } catch (e) {
        callback(e);
      }
    }
    self._index = 0;
    loop();
  },
  reduce: function reduce(fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    function loop() {
      try {
        while (self._index < self._result.length) {
          accu = fn(accu, self._result[self._index], self._index, self);
          self._index++;
        }
        if (!self._hasMore) callback(null, accu);else {
          self._more(function (err) {
            if (err) callback(err);else loop();
          });
        }
      } catch (e) {
        callback(e);
      }
    }
    if (accu !== undefined) {
      self._index = 0;
      loop();
    } else if (self._result.length > 1) {
      accu = self._result[0];
      self._index = 1;
      loop();
    } else {
      self._more(function (err) {
        if (err) callback(err);else {
          accu = self._result[0];
          self._index = 1;
          loop();
        }
      });
    }
  },
  rewind: function rewind() {
    this._index = 0;
  }
});
},{"./util/noop":10,"extend":"extend"}],5:[function(require,module,exports){
'use strict';
var noop = require('./util/noop');
var extend = require('extend');
var Connection = require('./connection');
var ArrayCursor = require('./cursor');
var createCollection = require('./collection');
var Graph = require('./graph');
var all = require('./util/all');

module.exports = Database;

function Database(config) {
  if (!(this instanceof Database)) {
    return new Database(config);
  }
  this._connection = new Connection(config);
  this._api = this._connection.route('_api');
  this.name = this._connection.config.databaseName;
}

extend(Database.prototype, {
  route: function route(path, headers) {
    return this._connection.route(path, headers);
  },
  createCollection: (function (_createCollection) {
    function createCollection(_x, _x2) {
      return _createCollection.apply(this, arguments);
    }

    createCollection.toString = function () {
      return _createCollection.toString();
    };

    return createCollection;
  })(function (properties, callback) {
    if (!callback) callback = noop;
    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({
      type: 2
    }, properties), function (err, body) {
      if (err) callback(err);else callback(null, createCollection(self._connection, body));
    });
  }),
  createEdgeCollection: function createEdgeCollection(properties, callback) {
    if (!callback) callback = noop;
    if (typeof properties === 'string') {
      properties = { name: properties };
    }
    var self = this;
    self._api.post('collection', extend({}, properties, { type: 3 }), function (err, body) {
      if (err) callback(err);else callback(null, createCollection(self._connection, body));
    });
  },
  collection: function collection(collectionName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203) callback(err);else self.createCollection({ name: collectionName }, callback);
      } else callback(null, createCollection(self._connection, body));
    });
  },
  collections: function collections(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, body) {
      if (err) callback(err);else {
        callback(null, body.collections.map(function (data) {
          return createCollection(self._connection, data);
        }));
      }
    });
  },
  allCollections: function allCollections(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, body) {
      if (err) callback(err);else {
        callback(null, body.collections.map(function (data) {
          return createCollection(self._connection, data);
        }));
      }
    });
  },
  dropCollection: function dropCollection(collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api['delete']('collection/' + collectionName, function (err, body) {
      if (err) callback(err);else callback(null);
    });
  },
  createGraph: function createGraph(properties, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.post('gharial', properties, function (err, body) {
      if (err) callback(err);else callback(null, new Graph(self._connection, body.graph));
    });
  },
  graph: function graph(graphName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._api.get('gharial/' + graphName, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1924) callback(err);else self.createGraph({ name: graphName }, callback);
      } else callback(null, new Graph(self._connection, body.graph));
    });
  },
  graphs: function graphs(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('gharial', function (err, body) {
      if (err) callback(err);else {
        callback(null, body.graphs.map(function (graph) {
          return new Graph(self._connection, graph);
        }));
      }
    });
  },
  dropGraph: function dropGraph(graphName, dropCollections, callback) {
    if (typeof dropCollections === 'function') {
      callback = dropCollections;
      dropCollections = undefined;
    }
    if (!callback) callback = noop;
    this._api['delete']('graph/' + graphName, { dropCollections: dropCollections }, callback);
  },
  createDatabase: function createDatabase(databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.post('database', { name: databaseName }, function (err, body) {
      if (err) callback(err);else {
        callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
      }
    });
  },
  database: function database(databaseName, autoCreate, callback) {
    if (typeof autoCreate === 'function') {
      callback = autoCreate;
      autoCreate = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    self._connection.request({
      method: 'get',
      path: '/_db/' + databaseName + '/_api/database/current',
      absolutePath: true
    }, function (err, body) {
      if (err) {
        if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1228) callback(err);else self.createDatabase(databaseName, callback);
      } else {
        callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
      }
    });
  },
  databases: function databases(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('database', function (err, body) {
      if (err) callback(err);else {
        callback(null, body.result.map(function (databaseName) {
          return new Database(extend({}, self._connection.config, { databaseName: databaseName }));
        }));
      }
    });
  },
  dropDatabase: function dropDatabase(databaseName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api['delete']('database/' + databaseName, function (err, body) {
      if (err) callback(err);else callback(null);
    });
  },
  truncate: function truncate(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: true
    }, function (err, body) {
      if (err) callback(err);else {
        all(body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);else cb(null, body);
            });
          };
        }), callback);
      }
    });
  },
  truncateAll: function truncateAll(callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection', {
      excludeSystem: false
    }, function (err, body) {
      if (err) callback(err);else {
        all(body.collections.map(function (data) {
          return function (cb) {
            self._api.put('collection/' + data.name + '/truncate', function (err, body) {
              if (err) cb(err);else cb(null, body);
            });
          };
        }), callback);
      }
    });
  },
  transaction: function transaction(collections, action, params, lockTimeout, callback) {
    if (typeof lockTimeout === 'function') {
      callback = lockTimeout;
      lockTimeout = undefined;
    }
    if (typeof params === 'function') {
      callback = params;
      params = undefined;
    }
    if (typeof params === 'number') {
      lockTimeout = params;
      params = undefined;
    }
    if (typeof collections === 'string' || Array.isArray(collections)) {
      collections = { write: collections };
    }
    if (!callback) callback = noop;
    this._api.post('transaction', {
      collections: collections,
      action: action,
      params: params,
      lockTimeout: lockTimeout
    }, function (err, body) {
      if (err) callback(err);else callback(null, body.result);
    });
  },
  query: (function (_query) {
    function query(_x3, _x4, _x5) {
      return _query.apply(this, arguments);
    }

    query.toString = function () {
      return _query.toString();
    };

    return query;
  })(function (query, bindVars, callback) {
    if (typeof bindVars === 'function') {
      callback = bindVars;
      bindVars = undefined;
    }
    if (!callback) callback = noop;
    if (query && typeof query.toAQL === 'function') {
      query = query.toAQL();
    }
    var self = this;
    self._api.post('cursor', {
      query: query,
      bindVars: bindVars
    }, function (err, body) {
      if (err) callback(err);else callback(null, new ArrayCursor(self._connection, body));
    });
  }),
  functions: function functions(callback) {
    if (!callback) callback = noop;
    this._api.get('aqlfunction', function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  createFunction: function createFunction(name, code, callback) {
    this._api.post('aqlfunction', {
      name: name,
      code: code
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  dropFunction: function dropFunction(name, group, callback) {
    if (typeof group === 'function') {
      callback = group;
      group = undefined;
    }
    this._api['delete']('aqlfunction/' + name, {
      group: Boolean(group)
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  }
});
},{"./collection":2,"./connection":3,"./cursor":4,"./graph":7,"./util/all":9,"./util/noop":10,"extend":"extend"}],6:[function(require,module,exports){
'use strict';
var util = require('util');

module.exports = ArangoError;

function ArangoError(obj) {
  this.message = obj.errorMessage;
  this.errorNum = obj.errorNum;
  this.code = obj.code;
  var err = new Error(this.message);
  err.name = this.name;
  if (err.fileName) this.fileName = err.fileName;
  if (err.lineNumber) this.lineNumber = err.lineNumber;
  if (err.columnNumber) this.columnNumber = err.columnNumber;
  if (err.stack) this.stack = err.stack;
  if (err.description) this.description = err.description;
  if (err.number) this.number = err.number;
}

util.inherits(ArangoError, Error);
ArangoError.prototype.name = 'ArangoError';
},{"util":17}],7:[function(require,module,exports){
'use strict';
var noop = require('./util/noop');
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
  drop: function drop(dropCollections, callback) {
    if (typeof dropCollections === 'function') {
      callback = dropCollections;
      dropCollections = undefined;
    }
    if (!callback) callback = noop;
    this._gharial['delete']({
      dropCollections: dropCollections
    }, callback);
  },
  vertexCollection: function vertexCollection(collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);else callback(null, new VertexCollection(self._connection, body, self));
    });
  },
  addVertexCollection: function addVertexCollection(collectionName, callback) {
    this._gharial.post('vertex', { collection: collectionName }, callback);
  },
  removeVertexCollection: function removeVertexCollection(collectionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._gharial['delete']('vertex/' + collectionName, { dropCollection: dropCollection }, callback);
  },
  edgeCollection: function edgeCollection(collectionName, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._api.get('collection/' + collectionName, function (err, body) {
      if (err) callback(err);else callback(null, new EdgeCollection(self._connection, body, self));
    });
  },
  addEdgeDefinition: function addEdgeDefinition(definition, callback) {
    this._gharial.post('edge', definition, callback);
  },
  replaceEdgeDefinition: function replaceEdgeDefinition(definitionName, definition, callback) {
    if (!callback) callback = noop;
    this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, callback);
  },
  removeEdgeDefinition: function removeEdgeDefinition(definitionName, dropCollection, callback) {
    if (typeof dropCollection === 'function') {
      callback = dropCollection;
      dropCollection = undefined;
    }
    this._gharial['delete']('edge/' + definitionName, { dropCollection: dropCollection }, callback);
  },
  traversal: function traversal(startVertex, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts;
      opts = undefined;
    }
    this._api.post('traversal', extend({}, opts, {
      startVertex: startVertex,
      graphName: this.name
    }), function (err, data) {
      if (err) callback(err);else callback(null, data.result);
    });
  }
});

function VertexCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.route('gharial/' + this.graph.name + '/vertex/' + this.name);
}
inherits(VertexCollection, BaseCollection);

extend(VertexCollection.prototype, {
  vertex: function vertex(documentHandle, callback) {
    if (!callback) callback = noop;
    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  save: function save(data, callback) {
    if (!callback) callback = noop;
    this._gharial.post(data, {
      collection: this.name
    }, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  }
});

function EdgeCollection(connection, body, graph) {
  this.graph = graph;
  BaseCollection.call(this, connection, body);
  this._gharial = this._api.route('gharial/' + this.graph.name + '/edge/' + this.name);
}
inherits(EdgeCollection, BaseCollection);

extend(EdgeCollection.prototype, {
  edge: function edge(documentHandle, callback) {
    if (!callback) callback = noop;
    this._gharial.get(documentHandle, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  },
  save: function save(data, fromId, toId, callback) {
    if (typeof fromId === 'function') {
      callback = fromId;
      fromId = undefined;
    } else {
      data._from = this._documentHandle(fromId);
      data._to = this._documentHandle(toId);
    }
    if (!callback) callback = noop;
    this._gharial.post(data, function (err, body) {
      if (err) callback(err);else callback(null, body);
    });
  }
});
},{"./collection":2,"./util/noop":10,"extend":"extend","util":17}],8:[function(require,module,exports){
'use strict';
var extend = require('extend');

module.exports = Route;

function Route(connection, path, headers) {
  this._connection = connection;
  this._path = path || '';
  this._headers = headers;
}

extend(Route.prototype, {
  route: function route(path, headers) {
    if (!path) path = '';else if (path.charAt(0) !== '/') path = '/' + path;
    return new Route(this._connection, this._path + path, extend({}, this._headers, headers));
  },
  request: function request(opts, callback) {
    opts = extend({}, opts);
    opts.basePath = this._path;
    opts.headers = extend({}, this._headers, opts.headers);
    return this._connection.request(opts, callback);
  },
  get: function get(path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'get',
      path: path,
      qs: qs
    }, callback);
  },
  post: function post(path, body, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = body;
      body = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof body === 'function') {
      callback = body;
      body = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'post',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  put: function put(path, body, qs, callback) {
    if (typeof path !== 'string') {
      callback = body;
      body = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof body === 'function') {
      callback = body;
      body = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'put',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  patch: function patch(path, body, qs, callback) {
    if (typeof path !== 'string') {
      callback = body;
      body = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof body === 'function') {
      callback = body;
      body = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'patch',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  'delete': function _delete(path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'delete',
      path: path,
      qs: qs
    }, callback);
  },
  head: function head(path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'head',
      path: path,
      qs: qs
    }, callback);
  }
});
},{"extend":"extend"}],9:[function(require,module,exports){
'use strict';
module.exports = function all(arr, callback) {
  var result = [];
  var pending = arr.length;
  var called = false;

  if (arr.length === 0) {
    return callback(null, result);
  }function step(i) {
    return function (err, res) {
      pending -= 1;
      if (!err) result[i] = res;
      if (!called) {
        if (err) callback(err);else if (pending === 0) callback(null, result);else return;
        called = true;
      }
    };
  }

  arr.forEach(function (fn, i) {
    fn(step(i));
  });
};
},{}],10:[function(require,module,exports){
'use strict';
module.exports = function () {};
},{}],11:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],12:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],15:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":13,"./encode":14}],16:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],17:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":16,"_process":12,"inherits":11}]},{},[1])(1)
});