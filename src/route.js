'use strict';
var extend = require('extend');

export default class Route {
  constructor(connection, path, headers) {
    this._connection = connection;
    this._path = path || '';
    this._headers = headers;
  }

  route(path, headers) {
    if (!path) path = '';
    else if (path.charAt(0) !== '/') path = '/' + path;
    return new Route(
      this._connection,
      this._path + path,
      extend({}, this._headers, headers)
    );
  }

  request(opts, callback) {
    opts = extend({}, opts);
    opts.basePath = this._path;
    opts.headers = extend({}, this._headers, opts.headers);
    return this._connection.request(opts, callback);
  }

  get(path, qs, callback) {
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
    return this.request({
      method: 'get',
      path: path,
      qs: qs
    }, callback);
  }

  post(path, body, qs, callback) {
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
    return this.request({
      method: 'post',
      path: path,
      body: body,
      qs: qs
    }, callback);
  }

  put(path, body, qs, callback) {
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
    return this.request({
      method: 'put',
      path: path,
      body: body,
      qs: qs
    }, callback);
  }

  patch(path, body, qs, callback) {
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
    return this.request({
      method: 'patch',
      path: path,
      body: body,
      qs: qs
    }, callback);
  }

  delete(path, qs, callback) {
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
    return this.request({
      method: 'delete',
      path: path,
      qs: qs
    }, callback);
  }

  head(path, qs, callback) {
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
    return this.request({
      method: 'head',
      path: path,
      qs: qs
    }, callback);
  }
}
