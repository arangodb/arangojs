'use strict';
var http = require('http');
var parseUrl = require('url').parse;
var once = require('./once');
var joinPath = require('path').join;

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
  if (!agent && http.Agent) agent = new http.Agent(agentOptions); // server only

  var queue = [];
  var maxTasks = typeof agent.maxSockets === 'number' ? agent.maxSockets * 2 : Infinity;
  var activeTasks = 0;
  var baseUrlParts = rawCopy(parseUrl(baseUrl));

  function drainQueue() {
    if (!queue.length || activeTasks >= maxTasks) return;
    var task = queue.shift();
    activeTasks += 1;
    task(function () {
      activeTasks -= 1;
      drainQueue();
    });
  }

  return function request({method, url, headers, body}, cb) {
    var path = baseUrlParts.pathname ? (
      url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname
    ) : url.pathname;
    var search = url.search ? (
      baseUrlParts.search ? baseUrlParts.search + '&' + url.search.slice(1) : url.search
    ) : baseUrlParts.search;
    if (search) path += search;
    var options = {path, method, headers, agent};
    options.hostname = baseUrlParts.hostname;
    options.port = baseUrlParts.port;
    options.auth = baseUrlParts.auth;

    queue.push(function (next) {
      var callback = once(function () {
        next();
        cb.apply(this, arguments);
      });
      var req = http.request(options, function (res) {
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
