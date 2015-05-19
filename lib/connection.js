'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');
var qs = require('querystring');
var createRequest = require('./util/request');
var ArangoError = require('./error');
var Route = require('./route');
var jsonMime = /\/(json|javascript)(\W|$)/;

module.exports = Connection;

function Connection(config) {
  if (typeof config === 'string') {
    config = { url: config };
  }
  this.config = extend({}, Connection.defaults, config);
  this.config.agentOptions = extend({}, Connection.agentDefaults, this.config.agentOptions);
  if (!this.config.headers) this.config.headers = {};
  if (!this.config.headers['x-arango-version']) {
    this.config.headers['x-arango-version'] = this.config.arangoVersion;
  }
  this._request = createRequest(this.config.agent, this.config.agentOptions);
  this.promisify = promisify(this.config.promise);
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300
};
Connection.agentDefaults = {
  maxSockets: 3,
  keepAlive: true,
  keepAliveMsecs: 1000
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
  request: function request(opts, cb) {
    var _promisify = this.promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

    if (!opts) opts = {};
    var body = opts.body;
    var headers = { 'content-type': 'text/plain' };

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
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body
    }, function (err, res) {
      if (err) callback(err);else if (res.headers['content-type'].match(jsonMime)) {
        try {
          res.rawBody = res.body;
          res.body = JSON.parse(res.rawBody);
        } catch (e) {
          return callback(extend(e, { response: res }));
        }
        if (!res.body.error) callback(null, res);else callback(extend(new ArangoError(res.body), { response: res }));
      } else callback(null, extend(res, { rawBody: res.body }));
    });
    return promise;
  }
});