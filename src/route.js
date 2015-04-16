'use strict';
var extend = require('extend');

module.exports = Route;

function Route(connection, path, headers) {
  this._connection = connection;
  this._path = path || '';
  this._headers = headers;
}

extend(Route.prototype, {
  route: function (path, headers) {
    if (!path) path = '';
    else if (path.charAt(0) !== '/') path = '/' + path;
    return new Route(
      this._connection,
      this._path + path,
      extend({}, this._headers, headers)
    );
  },
  request: function (opts, callback) {
    opts = extend({}, opts);
    opts.basePath = this._path;
    opts.headers = extend({}, this._headers, opts.headers);
    return this._connection.request(opts, callback);
  },
  get: function (path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'get',
      path: path,
      qs: qs
    }, callback);
  },
  post: function (path, body, qs, callback) {
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
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'post',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  put: function (path, body, qs, callback) {
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
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'put',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  patch: function (path, body, qs, callback) {
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
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'patch',
      path: path,
      body: body,
      qs: qs
    }, callback);
  },
  delete: function (path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'delete',
      path: path,
      qs: qs
    }, callback);
  },
  head: function (path, qs, callback) {
    if (typeof path !== 'string') {
      callback = qs;
      qs = path;
      path = undefined;
    }
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (!path) path = '';
    else if (this._path && path.charAt(0) !== '/') path = '/' + path;
    this.request({
      method: 'head',
      path: path,
      qs: qs
    }, callback);
  }
});
