/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  ArangoError = require('./error');

module.exports = Collection;

function update(self, data) {
  for (var key in data) {
    if (data.hasOwnProperty(key)) self[key] = data[key];
  }
}

function Collection(connection, body) {
  this._connection = connection;
  update(this, body);
}

extend(Collection.prototype, {
  _get: function (path, update, callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
      if (err) callback(err);
      else {
        if (update) update(self, body);
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
        if (update) update(self, body);
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
  delete: function (callback) {
    if (!callback) callback = noop;
    var self = this;
    self._connection.delete('collection/' + self.name, function (err, body) {
      if (err) callback(err);
      else if (body.error) callback(new ArangoError(body));
      else callback(null, body);
    });
  }
});
