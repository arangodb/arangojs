/*jshint browserify: true */
"use strict";

var extend = require('extend'),
  ArangoError = require('./error'),
  promisify = require('./util/promisify');

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
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.get('collection/' + self.name + '/' + path, function (err, body) {
        if (err) reject(err);
        else {
          if (update) update(self, body);
          resolve(body);
        }
      });
    });
  },
  _put: function (path, data, update, callback) {
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.put('collection/' + self.name + '/' + path, data, function (err, body) {
        if (err) reject(err);
        else {
          if (update) update(self, body);
          resolve(body);
        }
      });
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
    var self = this;
    return promisify(callback, function (resolve, reject) {
      self._connection.delete('collection/' + self.name, function (err, body) {
        if (err) reject(err);
        else if (body.error) reject(new ArangoError(body));
        else resolve(body);
      });
    });
  }
});
