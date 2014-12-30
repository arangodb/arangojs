/*jshint browserify: true */
"use strict";

var noop = require('./util/noop'),
  extend = require('extend'),
  querystring = require('querystring'),
  request = require('request'),
  ArangoError = require('./error'),
  Endpoint = require('./endpoint'),
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
  endpoint: function (path) {
    return new Endpoint(this, path);
  },
  request: function (opts, callback) {
    if (!callback) callback = noop;
    if (!opts) opts = {};
    var body = opts.body,
      headers = {'content-type': 'text/plain'};

    if (body && typeof body === 'object') {
      body = JSON.stringify(body);
      headers['content-type'] = 'application/json';
    }

    var url = this.config.url;
    if (!opts.absolutePath) url += '/_db/' + this.config.databaseName;
    url += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
    if (opts.qs) url += '?' + (typeof opts.qs === 'string' ? opts.qs : querystring.stringify(opts.qs));

    request({
      url: url,
      headers: extend(headers, this.config.headers, opts.headers),
      method: (opts.method || 'get').toUpperCase(),
      body: body
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
  }
});
