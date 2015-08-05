'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var extend = require('extend');

var Route = (function () {
  function Route(connection, path, headers) {
    _classCallCheck(this, Route);

    this._connection = connection;
    this._path = path || '';
    this._headers = headers;
  }

  _createClass(Route, [{
    key: 'route',
    value: function route(path, headers) {
      if (!path) path = '';else if (path.charAt(0) !== '/') path = '/' + path;
      return new Route(this._connection, this._path + path, extend({}, this._headers, headers));
    }
  }, {
    key: 'request',
    value: function request(opts, callback) {
      opts = extend({}, opts);
      opts.basePath = this._path;
      opts.headers = extend({}, this._headers, opts.headers);
      return this._connection.request(opts, callback);
    }
  }, {
    key: 'get',
    value: function get(path, qs, callback) {
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
      return this.request({
        method: 'get',
        path: path,
        qs: qs
      }, callback);
    }
  }, {
    key: 'post',
    value: function post(path, body, qs, callback) {
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
      return this.request({
        method: 'post',
        path: path,
        body: body,
        qs: qs
      }, callback);
    }
  }, {
    key: 'put',
    value: function put(path, body, qs, callback) {
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
      return this.request({
        method: 'put',
        path: path,
        body: body,
        qs: qs
      }, callback);
    }
  }, {
    key: 'patch',
    value: function patch(path, body, qs, callback) {
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
      return this.request({
        method: 'patch',
        path: path,
        body: body,
        qs: qs
      }, callback);
    }
  }, {
    key: 'delete',
    value: function _delete(path, qs, callback) {
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
      return this.request({
        method: 'delete',
        path: path,
        qs: qs
      }, callback);
    }
  }, {
    key: 'head',
    value: function head(path, qs, callback) {
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
      return this.request({
        method: 'head',
        path: path,
        qs: qs
      }, callback);
    }
  }]);

  return Route;
})();

exports['default'] = Route;
module.exports = exports['default'];