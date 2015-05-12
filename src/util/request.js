'use strict';
var http = require('http');
var parseUrl = require('url').parse;
var extend = require('extend');
var once = require('./once');

module.exports = function (agent, agentOptions) {
  if (!agent && http.Agent) agent = new http.Agent(agentOptions); // server only
  return function request({method, url, headers, body}, cb) {
    var options = extend(parseUrl(url), {method, headers, agent});
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
