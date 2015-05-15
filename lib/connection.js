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
  this._promisify = config.promisify ? promisify : function (callback) {
    return { callback: callback || function () {} };
  };
  var u = this.config.url.split(':');
  this._urlParts = {
    protocol: u[0] + ':',
    hostname: u[1].substr(2),
    port: u[2]
  };
}

Connection.defaults = {
  url: 'http://127.0.0.1:8529',
  databaseName: '_system',
  arangoVersion: 20600,
  promisify: false
};

Connection.agentDefaults = {
  maxSockets: 3,
  keepAlive: true,
  keepAliveMsecs: 1000
};

extend(Connection.prototype, {
  _resolveUrl: function _resolveUrl(opts) {
    var url = '';
    if (!opts.absolutePath) {
      url += '/_db/' + this.config.databaseName;
      if (opts.basePath) url += '/' + opts.basePath;
    }
    url += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
    if (opts.qs) url += '?' + (typeof opts.qs === 'string' ? opts.qs : qs.stringify(opts.qs));
    return extend({}, this._urlParts, { path: url });
  },
  route: function route(path, isDocument) {
    return new Route(this, path, {}, isDocument);
  },
  request: function request(opts, cb, isDocument) {
    var _promisify = this._promisify(cb);

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
      headers['content-length'] = body.length;
    }

    if (isDocument) {
      this._request({
        url: this._resolveUrl(opts),
        headers: extend(headers, this.config.headers, opts.headers),
        method: (opts.method || 'get').toUpperCase(),
        body: body
      }, function (err, res) {
        if (err) callback(err);
        if (res.statusCode < 400) {
          /*
          res.rawBody = res.body;
          Object.defineProperty(res, 'body', {
                   get: function () {
              if (this.jsonBody === undefined) {
                       this.jsonBody = JSON.parse(this.rawBody);
                     }
                     return this.jsonBody;
                   }
          }); 
          */
          callback(null, res);
        } else {
          callback(extend(new ArangoError(JSON.parse(res.body)), { response: res }));
        }
      });
    } else {
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
    }
    return promise;
  }
});