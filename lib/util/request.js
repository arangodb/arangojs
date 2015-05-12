'use strict';
var http = require('http');
var parseUrl = require('url').parse;
var extend = require('extend');
var once = require('./once');

module.exports = function (agent, agentOptions) {
  if (!agent && http.Agent) agent = new http.Agent(agentOptions); // server only
  return function request(_ref, cb) {
    var method = _ref.method;
    var url = _ref.url;
    var headers = _ref.headers;
    var body = _ref.body;

    var options = extend(parseUrl(url), { method: method, headers: headers, agent: agent });
    var callback = once(cb);
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
  };
};