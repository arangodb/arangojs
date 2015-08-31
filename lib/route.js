'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

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
      return new Route(this._connection, this._path + path, (0, _extend2['default'])({}, this._headers, headers));
    }
  }, {
    key: 'request',
    value: function request(opts, callback) {
      opts = (0, _extend2['default'])({}, opts);
      opts.basePath = this._path;
      opts.headers = (0, _extend2['default'])({}, this._headers, opts.headers);
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
      return this.request({ path: path, qs: qs, method: 'get' }, callback);
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
      return this.request({ path: path, body: body, qs: qs, method: 'post' }, callback);
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
      return this.request({ path: path, body: body, qs: qs, method: 'put' }, callback);
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
      return this.request({ path: path, body: body, qs: qs, method: 'patch' }, callback);
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
      return this.request({ path: path, qs: qs, method: 'delete' }, callback);
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
      return this.request({ path: path, qs: qs, method: 'head' }, callback);
    }
  }]);

  return Route;
})();

exports['default'] = Route;
module.exports = exports['default'];