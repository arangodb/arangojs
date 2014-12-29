/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  querystring = require('querystring'),
  request = require('request'),
  ArangoError = require('./error'),
  jsonMime = /\/(json|javascript)(\W|$)/;

module.exports = Connection;

function Connection(config) {
  if (typeof config === 'string') {
    config = {url: config};
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
  request: function (opts, callback) {
    if (!callback) callback = noop;
    if (!opts) opts = {};
    var body = opts.body,
      headers = {'content-type': 'text/plain'};

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }

    var url = this.config.url + '/_db/' + this.config.databaseName + '/_api/' + opts.path;
    while (true) {
      var oldUrl = url;
      url = url.replace(/\/[^\/]+\/..\//, '/');
      if (oldUrl === url) break;
    }
    if (opts.qs) url += '?' + (typeof opts.qs === 'string' ? opts.qs : querystring.stringify(opts.qs));

    request({
      url: url,
      auth: opts.auth || this.config.auth,
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body,
      encoding: 'utf-8'
    }, function (err, response, rawBody) {
      if (err) callback(err);
      else if (!response.headers['content-type'].match(jsonMime)) callback(null, rawBody);
      else {
        try {
          var body = JSON.parse(rawBody);
          if (!body.error) callback(null, body);
          else callback(new ArangoError(body));
        }
        catch(e) {callback(e);}
      }
    });
  },
  get: function (path, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, qs: data}, callback);
  },
  post: function (path, data, qs, callback) {
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, body: data, qs: qs, method: 'post'}, callback);
  },
  put: function (path, data, qs, callback) {
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, body: data, qs: qs, method: 'put'}, callback);
  },
  patch: function (path, data, qs, callback) {
    if (typeof qs === 'function') {
      callback = qs;
      qs = undefined;
    }
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, body: data, qs: qs, method: 'patch'}, callback);
  },
  delete: function (path, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, qs: data, method: 'delete'}, callback);
  },
  head: function (path, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }
    this.request({path: path, qs: data, method: 'head'}, callback);
  }
});
