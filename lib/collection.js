/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  ArangoError = require('./error');

module.exports = Collection;

function Collection(connection, body) {
  this._connection = connection;
  extend(this, body);
}

extend(Collection.prototype, {
  _get: function (path, update, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
      if (err) callback(err);
      else {
        if (update) extend(self, body);
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
  revision: function (callback) {
    return this._get('revision', true, callback);
  },
  checksum: function (callback) {
    return this._get('checksum', true, callback);
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
      else if (body.error) callback(new ArangoError(body));
      else callback(null);
    });
  },
  document: function (documentHandle, callback) {
    if (!callback) callback = noop;
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.get('document/' + documentHandle, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
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
    this._connection.post('document', data, opts, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
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
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.put('document/' + documentHandle, data, opts, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
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
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.patch('document/' + documentHandle, data, opts, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
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
    if (documentHandle.indexOf('/') === -1) {
      documentHandle = this.name + '/' + documentHandle;
    }
    this._connection.delete('document/' + documentHandle, opts, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null);
    });
  },
  all: function (opts, callback) {
    if (!callback) callback = noop;
    opts = extend({}, opts, {collection: this.name});
    this._connection.get('document', function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, body);
    });
  }
});
