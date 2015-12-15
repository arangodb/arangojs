'use strict';
var promisify = require('./util/promisify');
var extend = require('extend');
var qs = require('querystring');
var createRequest = require('./util/request');
var ArangoError = require('./error');
var Route = require('./route');
var jsonMime = /\/(json|javascript)(\W|$)/;
var async = require('async');

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
  this._request = createRequest(this.config.url, this.config.agent, this.config.agentOptions);
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

Connection.batch = false;

extend(Connection.prototype, {
  _resolveUrl: function _resolveUrl(opts) {
    var url = { pathname: '' };
    if (!opts.absolutePath) {
      url.pathname += '/_db/' + this.config.databaseName;
      if (opts.basePath) url.pathname += '/' + opts.basePath;
    }
    url.pathname += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
    if (opts.qs) url.search = '?' + (typeof opts.qs === 'string' ? opts.qs : qs.stringify(opts.qs));
    return url;
  },
  route: function route(path) {
    return new Route(this, path);
  },
  request: function request(opts, cb) {
    var _promisify = this.promisify(cb);

    var promise = _promisify.promise;

    var callback = _promisify.callback;
    if(this.batch) {
        if(!this.batch[this.config.url]) {
            this.batch[this.config.url] = [];
        }
        this.batch[this.config.url].push({'opts':opts, 'callback': callback});
    }
    else {
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
    }
    return promise;
  },
  startBatch: function() {
      this.batch = {};
  },
  runBatch: function (cb) {
    var batch = this.batch;
    this.batch = false;
    var tasks = [];
    var connection = this;
    for (var host in batch) {
        tasks.push(function(taskCb) {
        var parts = batch[host];
        var bodyParts = [];
        var boundary = Math.random().toString(36).slice(2);
            for (var partIndex in parts)
            {
                var part = parts[partIndex];
                var url = connection._resolveUrl(part.opts);
                var body = part.opts.body;
                var method = (part.opts.method || 'get').toUpperCase();
                var path = url.pathname;
                if (url.search) {
                    path += url.search;
                }
                var partBody = "Content-Type: application/x-arango-batchpart\r\n"
                        + "Content-Id: " + partIndex + "\r\n\r\n"
                        + method + ' ' + path + ' HTTP/1.1';
                if (body) {
                    if (typeof body === 'object') {
                        if (part.opts.ld) {
                            body = body.map(function (obj) {
                                return JSON.stringify(obj);
                            }).join('\r\n') + '\r\n';
                        } else {
                            body = JSON.stringify(body);
                        }
                    } else {
                        body = String(body);
                    }
                    partBody += '\r\n\r\n' + body;
                }
                bodyParts.push(partBody);
            }
            var multipartBody = "--" + boundary + "\r\n"
                    + bodyParts.join("\r\n--" + boundary + "\r\n")
                    + "\r\n--" + boundary + "--";
            var opts = {
                "method": 'post',
                "path": 'batch',
                "basePath": "_api",
                'headers': {
                    "content-type": 'multipart/form-data; boundary=' + boundary,
                },
                'body': multipartBody
            };
            connection.request(opts, function (err, res) {
                try {
                    if (err) {
                        throw err;
                    }
                    var results = [];
                    var chunked = res.rawBody.toString().split('--' + boundary);
                    for (var i in chunked) {
                        var chunk = chunked[i].toString().trim();
                        if (chunk !== '' && chunk !== '--') {
                            results.push(chunk);
                        }
                    }
                    if (results.length !== parts.length) {
                        throw new ArangoError('Wrong part count in batch mode response');
                    }
                    var requestResults = [];
                    for (var i in results) {
                        var r = results[i];
                        var found = r.match(/^content-id:\s*(.*?)$/im);
                        if (!found) {
                            throw new ArangoError('Unable to find part content id');
                        }
                        var partRes = {
                            'rawBody':r.substr(r.lastIndexOf('\r\n\r\n'))
                        };
                        partRes.body = JSON.parse(partRes.rawBody);
                        var partIndex = found[1];
                        requestResults[partIndex] = partRes.body;
                        if (!partRes.body.error) {
                            parts[partIndex].callback(null, partRes);
                        }
                        else {
                            parts[partIndex].callback(extend(
                                new ArangoError(partRes.body),
                                {'response': res }
                            ));
                        }
                    }
                    // Doing this, we reorder results as callstack
                    // in case arango does not reply in the same order
                    results = [];
                    for(i = 0; i< requestResults.length; i++) {
                        results.push(requestResults[i]);
                    }
                    taskCb(null, results);
                }
                catch (err) {
                    for (partIndex in parts) {
                        parts[partIndex].callback(extend(err, { response: res }));
                    }
                    taskCb(err);
                }
            });
        });
    };
    async.parallel(tasks, function(err, results) {
        if(err) {
            cb(err);
            return;
        }
        var cbResults = [];
        for(var i in results) {
            for(var j in results[i]) {
                cbResults.push(results[i][j]);
            }
        }
        cb(null, cbResults);
    });
  }
});