'use strict';
var noop = require('./util/noop');
var extend = require('extend');
var qs = require('querystring');
var request = require('request');
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
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300
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
  request: (function (_request) {
    function request(_x, _x2) {
      return _request.apply(this, arguments);
    }

    request.toString = function () {
      return _request.toString();
    };

    return request;
  })(function (opts, callback) {
    if (!callback) callback = noop;
    if (!opts) opts = {};
    var body = opts.body,
        headers = { 'content-type': 'text/plain' };

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

    request({
      url: this._resolveUrl(opts),
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body
    }, function (err, response, rawBody) {
      if (err) callback(err, rawBody, response);else if (!response.headers['content-type'].match(jsonMime)) callback(null, rawBody, response);else {
        try {
          var body = JSON.parse(rawBody);
          if (!body.error) callback(null, body, response);else callback(new ArangoError(body));
        } catch (e) {
          callback(e, rawBody, response);
        }
      }
    });
  })
});