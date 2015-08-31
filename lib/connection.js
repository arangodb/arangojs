'use strict';
Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _utilPromisify = require('./util/promisify');

var _utilPromisify2 = _interopRequireDefault(_utilPromisify);

var _extend = require('extend');

var _extend2 = _interopRequireDefault(_extend);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _utilRequest = require('./util/request');

var _utilRequest2 = _interopRequireDefault(_utilRequest);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _route = require('./route');

var _route2 = _interopRequireDefault(_route);

var MIME_JSON = /\/(json|javascript)(\W|$)/;

var Connection = (function () {
  _createClass(Connection, null, [{
    key: 'defaults',
    value: {
      url: 'http://localhost:8529',
      databaseName: '_system',
      arangoVersion: 20300
    },
    enumerable: true
  }, {
    key: 'agentDefaults',
    value: {
      maxSockets: 3,
      keepAlive: true,
      keepAliveMsecs: 1000
    },
    enumerable: true
  }]);

  function Connection(config) {
    _classCallCheck(this, Connection);

    if (typeof config === 'string') {
      config = { url: config };
    }
    this.config = (0, _extend2['default'])({}, Connection.defaults, config);
    this.config.agentOptions = (0, _extend2['default'])({}, Connection.agentDefaults, this.config.agentOptions);
    if (!this.config.headers) this.config.headers = {};
    if (!this.config.headers['x-arango-version']) {
      this.config.headers['x-arango-version'] = this.config.arangoVersion;
    }
    this._request = (0, _utilRequest2['default'])(this.config.url, this.config.agent, this.config.agentOptions);
    this.promisify = (0, _utilPromisify2['default'])(this.config.promise);
  }

  _createClass(Connection, [{
    key: '_resolveUrl',
    value: function _resolveUrl(opts) {
      var url = { pathname: '' };
      if (!opts.absolutePath) {
        url.pathname = url.pathname + '/_db/' + this.config.databaseName;
        if (opts.basePath) url.pathname = url.pathname + '/' + opts.basePath;
      }
      url.pathname += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
      if (opts.qs) url.search = '?' + (typeof opts.qs === 'string' ? opts.qs : _querystring2['default'].stringify(opts.qs));
      return url;
    }
  }, {
    key: 'route',
    value: function route(path) {
      return new _route2['default'](this, path);
    }
  }, {
    key: 'request',
    value: function request(opts, cb) {
      var _promisify = this.promisify(cb);

      var promise = _promisify.promise;
      var callback = _promisify.callback;

      var headers = { 'content-type': 'text/plain' };
      if (!opts) opts = {};
      var body = opts.body;

      if (body) {
        if (typeof body === 'object') {
          if (opts.ld) {
            body = body.map(function (obj) {
              return JSON.stringify(obj);
            }).join('\r\n') + '\r\n';
            headers['content-type'] = 'application/x-ldjson';
          } else {
            body = JSON.stringify(body);
            headers['content-type'] = 'application/json';
          }
        } else {
          body = String(body);
        }
        headers['content-length'] = Buffer.byteLength(body, 'utf-8');
      }

      this._request({
        url: this._resolveUrl(opts),
        headers: (0, _extend2['default'])(headers, this.config.headers, opts.headers),
        method: (opts.method || 'get').toUpperCase(),
        body: body
      }, function (err, res) {
        if (err) callback(err);else if (res.headers['content-type'].match(MIME_JSON)) {
          try {
            res.rawBody = res.body;
            res.body = JSON.parse(res.rawBody);
          } catch (e) {
            return callback((0, _extend2['default'])(e, { response: res }));
          }
          if (!res.body.error) callback(null, res);else callback((0, _extend2['default'])(new _error2['default'](res.body), { response: res }));
        } else callback(null, (0, _extend2['default'])(res, { rawBody: res.body }));
      });
      return promise;
    }
  }]);

  return Connection;
})();

exports['default'] = Connection;
module.exports = exports['default'];