!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.arango=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

module.exports = require('./lib/database');

},{"./lib/database":5}],2:[function(require,module,exports){
'use strict';
var noop = require('./util/noop'), inherits = require('util').inherits, extend = require('extend'), ArangoError = require('./error');
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
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
            if (err)
                callback(err);
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
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.put('collection/' + self.name + '/' + path, data, function (err, body) {
            if (err)
                callback(err);
            else {
                if (update)
                    extend(self, body);
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
        return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, true, callback);
    },
    unload: function (callback) {
        return this._put('unload', undefined, true, callback);
    },
    setProperties: function (properties, callback) {
        return this._put('properties', properties, true, callback);
    },
    rename: function (name, callback) {
        return this._put('rename', { name: name }, true, callback);
    },
    rotate: function (callback) {
        return this._put('rotate', undefined, false, callback);
    },
    truncate: function (callback) {
        return this._put('truncate', undefined, true, callback);
    },
    drop: function (callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection['delete']('collection/' + self.name, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null);
        });
    },
    replace: function (documentHandle, data, opts, callback) {
        if (typeof opts === 'function') {
            callback = opts;
            opts = undefined;
        }
        if (!callback)
            callback = noop;
        opts = extend({}, opts, { collection: this.name });
        this._connection.put(this._documentPath(documentHandle), data, opts, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    update: function (documentHandle, data, opts, callback) {
        if (typeof opts === 'function') {
            callback = opts;
            opts = undefined;
        }
        if (!callback)
            callback = noop;
        opts = extend({}, opts, { collection: this.name });
        this._connection.patch(this._documentPath(documentHandle), data, opts, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    remove: function (documentHandle, opts, callback) {
        if (typeof opts === 'function') {
            callback = opts;
            opts = undefined;
        }
        if (!callback)
            callback = noop;
        opts = extend({}, opts, { collection: this.name });
        this._connection['delete'](this._documentPath(documentHandle), opts, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null);
        });
    },
    all: function (type, callback) {
        if (typeof type === 'function') {
            callback = type;
            type = undefined;
        }
        if (!callback)
            callback = noop;
        this._connection.get('document', {
            type: type || 'id',
            collection: this.name
        }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body.documents);
        });
    }
});
function DocumentCollection(connection, body) {
    BaseCollection.call(this, connection, body);
}
inherits(DocumentCollection, BaseCollection);
extend(DocumentCollection.prototype, {
    document: function (documentHandle, callback) {
        if (!callback)
            callback = noop;
        if (documentHandle.indexOf('/') === -1) {
            documentHandle = this.name + '/' + documentHandle;
        }
        this._connection.get('document/' + documentHandle, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    save: function (data, callback) {
        if (!callback)
            callback = noop;
        this._connection.post('document/', data, { collection: this.name }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    }
});
function EdgeCollection(connection, body) {
    BaseCollection.call(this, connection, body);
}
inherits(EdgeCollection, BaseCollection);
extend(EdgeCollection.prototype, {
    edge: function (documentHandle, callback) {
        if (!callback)
            callback = noop;
        if (documentHandle.indexOf('/') === -1) {
            documentHandle = this.name + '/' + documentHandle;
        }
        this._connection.get('edge/' + documentHandle, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    save: function (data, fromId, toId, callback) {
        if (!callback)
            callback = noop;
        this._connection.post('edge/', data, {
            collection: this.name,
            from: fromId,
            to: toId
        }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    _edges: function (vertex, direction, callback) {
        if (!callback)
            callback = noop;
        this._connection.get('edges/' + this.name, {
            vertex: vertex,
            direction: direction
        }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body.edges);
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
},{"./error":6,"./util/noop":9,"extend":15,"util":14}],3:[function(require,module,exports){
'use strict';
var noop = require('./util/noop'), extend = require('extend'), request = require('request'), ArangoError = require('./error'), jsonMime = /\/(json|javascript)(\W|$)/;
module.exports = Connection;
function Connection(config) {
    if (typeof config === 'string') {
        config = { url: config };
    }
    this.config = extend({}, Connection.defaults, config);
    if (!this.config.headers)
        this.config.headers = {};
    if (!this.config.headers['x-arango-version']) {
        this.config.headers['x-arango-version'] = this.config.arangoVersion;
    }
}
Connection.defaults = {
    url: 'http://localhost:8529',
    databaseName: '_system',
    arangoVersion: 20200
};
extend(Connection.prototype, {
    request: function (opts, callback) {
        if (!callback)
            callback = noop;
        var body = opts.body, headers = { 'content-type': 'text/plain' };
        if (body && typeof body === 'object') {
            body = JSON.stringify(body);
            headers['content-type'] = 'application/json';
        }
        var url = this.config.url + '/_db/' + this.config.databaseName + '/_api/' + opts.path;
        while (true) {
            var oldUrl = url;
            url = url.replace(/\/[^\/]+\/..\//, '/');
            if (oldUrl === url)
                break;
        }
        request({
            url: url,
            auth: opts.auth || this.config.auth,
            headers: extend(headers, this.config.headers, opts.headers),
            method: (opts.method || 'get').toUpperCase(),
            qs: opts.qs,
            body: body,
            encoding: 'utf-8'
        }, function (err, response, rawBody) {
            if (err)
                callback(err);
            else if (!response.headers['content-type'].match(jsonMime))
                callback(null, rawBody);
            else {
                try {
                    var body = JSON.parse(rawBody);
                    if (!body.error)
                        callback(null, body);
                    else
                        callback(new ArangoError(body));
                } catch (e) {
                    callback(e);
                }
            }
        });
    },
    get: function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data
        }, callback);
    },
    post: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'post'
        }, callback);
    },
    put: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'put'
        }, callback);
    },
    patch: function (path, data, qs, callback) {
        if (typeof qs === 'function') {
            callback = qs;
            qs = undefined;
        }
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            body: data,
            qs: qs,
            method: 'patch'
        }, callback);
    },
    'delete': function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data,
            method: 'delete'
        }, callback);
    },
    head: function (path, data, callback) {
        if (typeof data === 'function') {
            callback = data;
            data = undefined;
        }
        this.request({
            path: path,
            qs: data,
            method: 'head'
        }, callback);
    }
});
},{"./error":6,"./util/noop":9,"extend":15,"request":16}],4:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  ArangoError = require('./error'),
  all = require('./util/all');

module.exports = ArrayCursor;

function ArrayCursor(connection, body) {
  this.extra = body.extra;
  this._connection = connection;
  this._result = body.result;
  this._hasMore = Boolean(body.hasMore);
  this._id = body.id;
  this._current = 0;
}

extend(ArrayCursor.prototype, {
  _drain: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._more(function (err) {
      if (err) callback(err);
      else if (!self._hasMore) callback(null, self);
      else self._drain(callback);
    });
  },
  _more: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    if (!self._hasMore) callback(null, self);
    else {
      self._connection.put('cursor/' + this._id, function (err, body) {
        if (err) callback(err);
        else {
          self._result.push.apply(self._result, body.result);
          self._hasMore = body.hasMore;
          callback(null, self);
        }
      });
    }
  },
  all: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      if (err) callback(err);
      else callback(null, self._result);
    });
  },
  next: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    function next() {
      var value = self._result[self._current];
      self._current += 1;
      callback(null, value);
    }
    if (self._current < self._result.length) next();
    else {
      if (!self._hasMore) callback(null);
      else {
        self._more(function (err) {
          if (err) callback(err);
          else next();
        });
      }
    }
  },
  hasNext: function () {
    return (this._hasMore || this._current < this._result.length);
  },
  each: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._drain(function (err) {
      if (err) callback(err);
      else {
        try {
          var i, result;
          for (i = 0; i < self._result.length; i++) {
            result = fn(self._result[i], i, self);
            if (result === false) break;
          }
          callback(null);
        }
        catch (e) {callback(e);}
      }
    });
  },
  every: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        var i, result = true;
        for (i = x; i < self._result.length; i++) {
          result = fn(self._result[i], i, self);
          if (!result) break;
        }
        if (!self._hasMore || !result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  some: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        var i, result = false;
        for (i = x; i < self._result.length; i++) {
          result = fn(self._result[i], i, self);
          if (result) break;
        }
        if (!self._hasMore || result) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  map: function (fn, callback) {
    if (!callback) callback = noop;
    var self = this,
      result = [];

    function step(x) {
      try {
        var i;
        for (i = x; i < self._result.length; i++) {
          result.push(fn(self._result[i], i, self));
        }
        if (!self._hasMore) callback(null, result);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
          });
        }
      }
      catch(e) {callback(e);}
    }
    step(0);
  },
  reduce: function (fn, accu, callback) {
    if (typeof accu === 'function') {
      callback = accu;
      accu = undefined;
    }
    if (!callback) callback = noop;
    var self = this;
    function step(x) {
      try {
        var i;
        for (i = x; i < self._result.length; i++) {
          accu = fn(accu, self._result[i], i, self);
        }
        if (!self._hasMore) callback(null, accu);
        else {
          self._more(function (err) {
            if (err) callback(err);
            else step(i);
          });
        }
      }
      catch(e) {callback(e);}
    }
    if (accu !== undefined) step(0);
    else if (self._result.length > 1) {
      accu = self._result[0];
      step(1);
    }
    else {
      self._more(function (err) {
        if (err) callback(err);
        else {
          accu = self._result[0];
          step(1);
        }
      });
    }
  }
});

},{"./error":6,"./util/all":8,"./util/noop":9,"extend":15}],5:[function(require,module,exports){
'use strict';
var noop = require('./util/noop'), extend = require('extend'), map = require('array-map'), Connection = require('./connection'), ArangoError = require('./error'), ArrayCursor = require('./cursor'), createCollection = require('./collection'), Graph = require('./graph'), all = require('./util/all');
module.exports = Database;
function Database(config) {
    if (!(this instanceof Database)) {
        return new Database(config);
    }
    this._connection = new Connection(config);
    this.name = this._connection.config.databaseName;
}
extend(Database.prototype, {
    createCollection: function (properties, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.post('collection', properties, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, createCollection(self._connection, body));
        });
    },
    collection: function (collectionName, autoCreate, callback) {
        if (typeof autoCreate === 'function') {
            callback = autoCreate;
            autoCreate = undefined;
        }
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection/' + collectionName, function (err, body) {
            if (err) {
                if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203)
                    callback(err);
                else
                    self.createCollection({ name: collectionName }, callback);
            } else
                callback(null, createCollection(self._connection, body));
        });
    },
    collections: function (excludeSystem, callback) {
        if (typeof excludeSystem === 'function') {
            callback = excludeSystem;
            excludeSystem = undefined;
        }
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection', { excludeSystem: excludeSystem }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, map(body.collections, function (data) {
                    return createCollection(self._connection, data);
                }));
        });
    },
    dropCollection: function (collectionName, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection['delete']('collection/' + collectionName, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null);
        });
    },
    createGraph: function (properties, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.post('gharial', properties, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, new Graph(self._connection, body.graph));
        });
    },
    graph: function (graphName, autoCreate, callback) {
        if (typeof autoCreate === 'function') {
            callback = autoCreate;
            autoCreate = undefined;
        }
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('gharial/' + graphName, function (err, body) {
            if (err) {
                if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1203)
                    callback(err);
                else
                    self.createGraph({ name: graphName }, callback);
            } else
                callback(null, new Graph(self._connection, body.graph));
        });
    },
    graphs: function (callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('gharial', function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, map(body.graphs, function (graph) {
                    return new Graph(self._connection, graph);
                }));
        });
    },
    dropGraph: function (graphName, dropCollections, callback) {
        if (typeof dropCollections === 'function') {
            callback = dropCollections;
            dropCollections = undefined;
        }
        if (!callback)
            callback = noop;
        this._connection['delete']('graph/' + graphName, { dropCollections: dropCollections }, callback);
    },
    createDatabase: function (databaseName, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.post('database', { name: databaseName }, function (err, body) {
            if (err)
                callback(err);
            else {
                callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
            }
        });
    },
    database: function (databaseName, autoCreate, callback) {
        if (typeof autoCreate === 'function') {
            callback = autoCreate;
            autoCreate = undefined;
        }
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('../../' + databaseName + '/_api/database/current', function (err, body) {
            if (err) {
                if (!autoCreate || err.name !== 'ArangoError' || err.errorNum !== 1228)
                    callback(err);
                else
                    self.createDatabase(databaseName, callback);
            } else {
                callback(null, new Database(extend({}, self._connection.config, { databaseName: databaseName })));
            }
        });
    },
    databases: function (callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('database', function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, map(body.result, function (databaseName) {
                    return new Database(extend({}, self._connection.config, { databaseName: databaseName }));
                }));
        });
    },
    dropDatabase: function (databaseName, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection['delete']('database/' + databaseName, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null);
        });
    },
    truncate: function (excludeSystem, callback) {
        if (typeof excludeSystem === 'function') {
            callback = excludeSystem;
            excludeSystem = undefined;
        }
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection', { excludeSystem: excludeSystem }, function (err, body) {
            if (err)
                callback(err);
            else {
                all(map(body.collections, function (data) {
                    return function (cb) {
                        self._connection.put('collection/' + data.name + '/truncate', function (err, body) {
                            if (err)
                                cb(err);
                            else
                                cb(null, body);
                        });
                    };
                }), callback);
            }
        });
    },
    query: function (query, bindVars, callback) {
        if (typeof bindVars === 'function') {
            callback = bindVars;
            bindVars = undefined;
        }
        if (!callback)
            callback = noop;
        if (query && typeof query.toAQL === 'function') {
            query = query.toAQL();
        }
        var self = this;
        self._connection.post('cursor', {
            query: query,
            bindVars: bindVars
        }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, new ArrayCursor(self._connection, body));
        });
    }
});
},{"./collection":2,"./connection":3,"./cursor":4,"./error":6,"./graph":7,"./util/all":8,"./util/noop":9,"array-map":10,"extend":15}],6:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

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

},{"util":14}],7:[function(require,module,exports){
'use strict';
var noop = require('./util/noop'), extend = require('extend'), inherits = require('util').inherits, BaseCollection = require('./collection')._BaseCollection, ArangoError = require('./error');
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
        if (!callback)
            callback = noop;
        this._connection.post('gharial/' + this.name + '/' + path, data, callback);
    },
    _delete: function (path, data, callback) {
        if (!callback)
            callback = noop;
        this._connection['delete']('gharial/' + this.name + '/' + path, data, callback);
    },
    drop: function (dropCollections, callback) {
        if (typeof dropCollections === 'function') {
            callback = dropCollections;
            dropCollections = undefined;
        }
        if (!callback)
            callback = noop;
        this._connection['delete']('gharial/' + this.name, { dropCollections: dropCollections }, callback);
    },
    vertexCollection: function (collectionName, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection/' + collectionName, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, new VertexCollection(self._connection, body, self));
        });
    },
    addVertexCollection: function (collectionName, callback) {
        this._post('vertex', { collection: collectionName }, callback);
    },
    removeVertexCollection: function (collectionName, dropCollection, callback) {
        if (typeof dropCollection === 'function') {
            callback = dropCollection;
            dropCollection = undefined;
        }
        this._delete('vertex/' + collectionName, { dropCollection: dropCollection }, callback);
    },
    edgeCollection: function (collectionName, callback) {
        if (!callback)
            callback = noop;
        var self = this;
        self._connection.get('collection/' + collectionName, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, new EdgeCollection(self._connection, body, self));
        });
    },
    addEdgeDefinition: function (definition, callback) {
        this._post('edge', definition, callback);
    },
    replaceEdgeDefinition: function (definitionName, definition, callback) {
        if (!callback)
            callback = noop;
        this._connection.put('gharial/' + this.name + '/edge/' + definitionName, definition, callback);
    },
    removeEdgeDefinition: function (definitionName, dropCollection, callback) {
        if (typeof dropCollection === 'function') {
            callback = dropCollection;
            dropCollection = undefined;
        }
        this._delete('edge/' + definitionName, { dropCollection: dropCollection }, callback);
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
        if (!callback)
            callback = noop;
        this._connection.get(this._documentPath(documentHandle), function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    save: function (data, callback) {
        if (!callback)
            callback = noop;
        this._connection.post(this._relativePath(''), data, { collection: this.name }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
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
        if (!callback)
            callback = noop;
        this._connection.get(this._documentPath(documentHandle), function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    },
    save: function (data, fromId, toId, callback) {
        if (!callback)
            callback = noop;
        this._connection.post(this._relativePath(''), data, {
            collection: this.name,
            from: fromId,
            to: toId
        }, function (err, body) {
            if (err)
                callback(err);
            else
                callback(null, body);
        });
    }
});
},{"./collection":2,"./error":6,"./util/noop":9,"extend":15,"util":14}],8:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

module.exports = function all(arr, callback) {
  var result = [],
    pending = arr.length,
    called = false;

  function step(i) {
    return function (err, res) {
      pending -= 1;
      if (!err) result[i] = res;
      if (!called) {
        if (err) callback(err);
        else if (pending === 0) callback(null, result);
        else return;
        called = true;
      }
    };
  }

  for (var i = 0; i < arr.length; i++) {
    arr[i](step(i));
  }
};
},{}],9:[function(require,module,exports){
/*jshint browserify: true */
"use strict";

module.exports = function () {};
},{}],10:[function(require,module,exports){
module.exports = function (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        if (hasOwn.call(xs, i)) res.push(f(x, i, xs));
    }
    return res;
};

var hasOwn = Object.prototype.hasOwnProperty;

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
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],14:[function(require,module,exports){
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
},{"./support/isBuffer":13,"_process":12,"inherits":11}],15:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	'use strict';
	if (!obj || toString.call(obj) !== '[object Object]') {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	'use strict';
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if ((typeof target !== 'object' && typeof target !== 'function') || target == null) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],16:[function(require,module,exports){
var window = require("global/window")
var once = require("once")
var parseHeaders = require('parse-headers')

var messages = {
    "0": "Internal XMLHttpRequest Error",
    "4": "4xx Client Error",
    "5": "5xx Server Error"
}

var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ? XHR : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    callback = once(callback)

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new XDR()
        }else{
            xhr = new XHR()
        }
    }

    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var key
    var load = options.response ? loadResponse : loadXhr

    if ("json" in options) {
        isJson = true
        headers["Accept"] = "application/json"
        if (method !== "GET" && method !== "HEAD") {
            headers["Content-Type"] = "application/json"
            body = JSON.stringify(options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = load
    xhr.onerror = error
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    // hate IE
    xhr.ontimeout = noop
    xhr.open(method, uri, !sync)
                                    //backward compatibility
    if (options.withCredentials || (options.cors && options.withCredentials !== false)) {
        xhr.withCredentials = true
    }

    // Cannot set timeout with sync request
    if (!sync) {
        xhr.timeout = "timeout" in options ? options.timeout : 5000
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }
    
    if ("beforeSend" in options && 
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    xhr.send(body)

    return xhr

    function readystatechange() {
        if (xhr.readyState === 4) {
            load()
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = null

        if (xhr.response) {
            body = xhr.response
        } else if (xhr.responseType === 'text' || !xhr.responseType) {
            body = xhr.responseText || xhr.responseXML
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function getStatusCode() {
        return xhr.status === 1223 ? 204 : xhr.status
    }

    // if we're getting a none-ok statusCode, build & return an error
    function errorFromStatusCode(status) {
        var error = null
        if (status === 0 || (status >= 400 && status < 600)) {
            var message = (typeof body === "string" ? body : false) ||
                messages[String(status).charAt(0)]
            error = new Error(message)
            error.statusCode = status
        }

        return error
    }

    // will load the data & process the response in a special response object
    function loadResponse() {
        var status = getStatusCode()
        var error = errorFromStatusCode(status)
        var response = {
            body: getBody(),
            statusCode: status,
            statusText: xhr.statusText,
            raw: xhr
        }
        if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
            response.headers = parseHeaders(xhr.getAllResponseHeaders())
        } else {
            response.headers = {}
        }

        callback(error, response, response.body)
    }

    // will load the data and add some response properties to the source xhr
    // and then respond with that
    function loadXhr() {
        var status = getStatusCode()
        var error = errorFromStatusCode(status)

        xhr.status = xhr.statusCode = status
        xhr.body = getBody()
        xhr.headers = parseHeaders(xhr.getAllResponseHeaders())

        callback(error, xhr, xhr.body)
    }

    function error(evt) {
        callback(evt, xhr)
    }
}


function noop() {}

},{"global/window":17,"once":18,"parse-headers":22}],17:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],19:[function(require,module,exports){
var isFunction = require('is-function')

module.exports = forEach

var toString = Object.prototype.toString
var hasOwnProperty = Object.prototype.hasOwnProperty

function forEach(list, iterator, context) {
    if (!isFunction(iterator)) {
        throw new TypeError('iterator must be a function')
    }

    if (arguments.length < 3) {
        context = this
    }
    
    if (toString.call(list) === '[object Array]')
        forEachArray(list, iterator, context)
    else if (typeof list === 'string')
        forEachString(list, iterator, context)
    else
        forEachObject(list, iterator, context)
}

function forEachArray(array, iterator, context) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            iterator.call(context, array[i], i, array)
        }
    }
}

function forEachString(string, iterator, context) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        iterator.call(context, string.charAt(i), i, string)
    }
}

function forEachObject(object, iterator, context) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            iterator.call(context, object[k], k, object)
        }
    }
}

},{"is-function":20}],20:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],21:[function(require,module,exports){

exports = module.exports = trim;

function trim(str){
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  return str.replace(/\s*$/, '');
};

},{}],22:[function(require,module,exports){
var trim = require('trim')
  , forEach = require('for-each')
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  forEach(
      trim(headers).split('\n')
    , function (row) {
        var index = row.indexOf(':')
          , key = trim(row.slice(0, index)).toLowerCase()
          , value = trim(row.slice(index + 1))

        if (typeof(result[key]) === 'undefined') {
          result[key] = value
        } else if (isArray(result[key])) {
          result[key].push(value)
        } else {
          result[key] = [ result[key], value ]
        }
      }
  )

  return result
}
},{"for-each":19,"trim":21}]},{},[1])(1)
});