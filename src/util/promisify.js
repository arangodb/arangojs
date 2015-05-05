'use strict';
module.exports = function promisify(callback) {
  if (typeof Promise !== 'function') {
    return {callback: callback || function () {}};
  }
  var cb = callback;
  var promise = new Promise(function (resolve, reject) {
    callback = function (err, res) {
      if (err) reject(err);
      else resolve(res);
    };
  });
  if (cb) {
    promise.then(
      result => cb(null, result),
      reason => cb(reason)
    );
  }
  return {callback, promise};
};
