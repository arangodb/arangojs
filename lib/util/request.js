'use strict';
var http = require('http');
var https = require('https');
var parseUrl = require('url').parse;
var once = require('./once');
var LinkedList = require('linkedlist');

function joinPath() {
  var a = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
  var b = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

  if (!a && !b) return '';
  var leadingSlash = a.charAt(0) === '/';
  var trailingSlash = b.charAt(b.length - 1) === '/';
  var tokens = (a + '/' + b).split('/').filter(Boolean);
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (token === '..') {
      tokens.splice(i - 1, 2);
      i--;
    } else if (token === '.') {
      tokens.splice(i, 1);
      i--;
    }
  }
  var path = tokens.join('/');
  if (leadingSlash) path = '/' + path;
  if (trailingSlash) path = path + '/';
  return path;
}

function rawCopy(obj) {
  var data = {};
  for (var k in obj) {
    if (obj.hasOwnProperty(k)) {
      data[k] = obj[k];
    }
  }
  return data;
}

module.exports = function (baseUrl, agent, agentOptions) {
  var baseUrlParts = rawCopy(parseUrl(baseUrl));
  var isSsl = baseUrlParts.protocol === 'https:';

  if (!agent) {
    agent = new (isSsl ? https : http).Agent(agentOptions);
  }

  var queue = new LinkedList();
  var maxTasks = typeof agent.maxSockets === 'number' ? agent.maxSockets * 2 : Infinity;
  var activeTasks = 0;

  function drainQueue() {
    if (!queue.length || activeTasks >= maxTasks) return;
    var task = queue.shift();
    activeTasks += 1;
    task(function () {
      activeTasks -= 1;
      drainQueue();
    });
  }

  return function request(_ref, cb) {
    var method = _ref.method;
    var url = _ref.url;
    var headers = _ref.headers;
    var body = _ref.body;

    var path = baseUrlParts.pathname ? url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname : url.pathname;
    var search = url.search ? baseUrlParts.search ? baseUrlParts.search + '&' + url.search.slice(1) : url.search : baseUrlParts.search;
    if (search) path += search;
    var options = { path: path, method: method, headers: headers, agent: agent };
    options.hostname = baseUrlParts.hostname;
    options.port = baseUrlParts.port;
    options.auth = baseUrlParts.auth;

    queue.push(function (next) {
      var callback = once(function () {
        next();
        cb.apply(this, arguments);
      });
      var req = (isSsl ? https : http).request(options, function (res) {
        var data = [];
        res.on('data', function (b) {
          data.push(b);
        }).on('end', function () {
          res.body = data.join('');
          callback(null, res);
        });
      });
      req.on('error', function (err) {
        err.request = req;
        callback(err);
      });
      if (body) req.write(body);
      req.end();
    });

    drainQueue();
  };
};