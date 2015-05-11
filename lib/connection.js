'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');
var qs = require('querystring');
var xhr = require('request');
var ArangoError = require('./error');
var Route = require('./route');
var jsonMime = /\/(json|javascript)(\W|$)/;

module.exports = Connection;

function Connection(config) {
  if (typeof config === 'string') {
    config = { url: config };
  }
  this.config = extend({}, Connection.defaults, config);
  if (!this.config.headers) this.config.headers = {};
  if (!this.config.headers['x-arango-version']) {
    this.config.headers['x-arango-version'] = this.config.arangoVersion;
  }
  this.pool = extend({}, Connection.defaults.poolOpts, this.config.poolOpts);
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300,
  keepAlive: true,
  requestOpts: {},
  poolOpts: { maxSockets: 5 }
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
    var _promisify = promisify(cb);

    var promise = _promisify.promise;
    var callback = _promisify.callback;

    if (!opts) opts = {};
    var body = opts.body;
    var headers = { 'content-type': 'text/plain' };

    if (body && typeof body === 'object') {
      if (opts.ld) {
        body = body.map(function (obj) {
          return JSON.stringify(obj);
        }).join('\r\n') + '\r\n';
        headers['content-type'] = 'application/x-ldjson';
      } else {
        body = JSON.stringify(body);
        headers['content-type'] = 'application/json';
      }
    }

    xhr(extend({}, Connection.defaults.requestOpts, this.config.requestOpts, {
      url: this._resolveUrl(opts),
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      pool: this.pool,
      body: body
    }), function (err, response, rawBody) {
      response.rawBody = rawBody;
      if (err) callback(err, response);else if (response.headers['content-type'].match(jsonMime)) {
        try {
          response.body = JSON.parse(rawBody);
        } catch (e) {
          return callback(extend(e, { response: response }));
        }
        if (!response.body.error) callback(null, response);else callback(extend(new ArangoError(response.body), { response: response }));
      } else callback(null, extend(response, { body: rawBody }));
    });
    return promise;
  }
});