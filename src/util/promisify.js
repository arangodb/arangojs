'use strict';
module.exports = function (PromiseCtor) {
  if (PromiseCtor === false) {
    return function (callback = function () {}) {
      return {callback};
    };
  }

  return function (callback = function () {}) {
    if (!PromiseCtor && typeof Promise !== 'function') {
      return {callback};
    }

    function defer(resolve, reject) {
      var errback = callback;
      callback = function (err, res) {
        if (err) reject(err);
        else resolve(res);
        if (errback) errback(err, res);
      };
    }

    var promise = PromiseCtor ? new PromiseCtor(defer) : new Promise(defer);

    return {callback, promise};
  };
};
