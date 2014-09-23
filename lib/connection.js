/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  request = require('request');

module.exports = Connection;

function Connection(config) {
  if (typeof config === 'string') {
    config = {url: config};
  }
  this.config = extend({}, Connection.defaults, config);
  if (!this.config.headers['x-arango-version']) {
    this.config.headers['x-arango-version'] = this.config.arangoVersion;
  }
}

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system'
  arangoVersion: 20200,
  headers: {}
};

extend(Connection.prototype, {
  request: function (opts, callback) {
    if (!callback) callback = noop;
    var body = opts.body,
      headers = {'content-type': 'text/plain'};

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }

    request({
      url: this.config.url + '/_db/' + this.config.databaseName + '/_api/' + opts.path,
      auth: opts.auth || this.config.auth,
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      qs: opts.qs,
      body: body,
      encoding: 'utf-8'
    }, function (err, response, body) {
      if (err) callback(err);
      else {
        try {callback(null, body ? JSON.parse(body) : null);}
        catch (e) {callback(e);}
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
