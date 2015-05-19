'use strict';
module.exports = function (PromiseCtor) {
  if (PromiseCtor === false) {
    return function (callback) {
      return {callback: callback || function () {}};
    };
  }

  return function (callback) {
    if (!PromiseCtor && typeof Promise !== 'function') {
      return {callback: callback || function () {}};
    }

    function defer(resolve, reject) {
      callback = function (err, res) {
        if (err) reject(err);
        else resolve(res);
      };
    }

    var cb = callback;

    var promise = PromiseCtor ? new PromiseCtor(defer) : new Promise(defer);

    if (cb) {
      promise.then(
        result => cb(null, result),
        reason => cb(reason)
      );
    }

    return {callback, promise};
  };
};
