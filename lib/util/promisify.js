'use strict';
module.exports = function promisify(callback) {
  if (typeof Promise !== 'function') {
    return { callback: callback || function () {} };
  }
  var cb = callback;
  var promise = new Promise(function (resolve, reject) {
    callback = function (err, res) {
      if (err) reject(err);else resolve(res);
    };
  });
  if (cb) {
    promise.then(function (result) {
      return cb(null, result);
    }, function (reason) {
      return cb(reason);
    });
  }
  return { callback: callback, promise: promise };
};