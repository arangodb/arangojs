/*jshint browserify */
"use strict";

var Promise = require('promise-es6').Promise;

module.exports = promisify;

function promisify(callback, deferred) {
  var promise = new Promise(deferred);
  if (callback) {
    return promise.then(
      function (result) {
        return callback(null, result);
      },
      function (reason) {
        return callback(reason);
      }
    );
  }
  return promise;
}
